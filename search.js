// municipalities.js で定義された `municipalities` / PREF_NAMES / PREF_REGION を使用する

const searchInput = document.getElementById("searchInput");
const searchCount = document.getElementById("searchCount");
const searchResults = document.getElementById("searchResults");

const MAX_RESULTS = 100; // 表示件数の上限（多すぎるとDOMが重くなるため）

// municipalities.js の短縮キー形式（n,k,r,p,t）を、扱いやすいフルネームの一覧に変換しておく
const allPlaces = municipalities.map(m => ({
    name: m.n,
    kana: m.k,
    romaji: m.r,
    pref: PREF_NAMES[m.p - 1],
    region: PREF_REGION[m.p - 1],
    type: m.t
}));

function buildSearchLinkUrl(item, keyword) {
    const q = `${item.pref} ${item.name} ${keyword}`;
    return `https://www.google.com/search?q=${encodeURIComponent(q)}`;
}

function matchesQuery(item, query) {
    const q = query.trim().toLowerCase();
    if (!q) return false;
    return (
        item.name.includes(query.trim()) ||
        item.kana.includes(query.trim()) ||
        item.romaji.toLowerCase().includes(q) ||
        item.pref.includes(query.trim())
    );
}

function renderResults(query) {
    const trimmed = query.trim();

    if (!trimmed) {
        searchCount.textContent = "上の欄に地名を入力してください";
        searchResults.innerHTML = "";
        return;
    }

    const matched = allPlaces.filter(item => matchesQuery(item, trimmed));

    if (matched.length === 0) {
        searchCount.textContent = "該当する地名が見つかりませんでした";
        searchResults.innerHTML = "";
        return;
    }

    const shown = matched.slice(0, MAX_RESULTS);
    searchCount.textContent = matched.length > MAX_RESULTS
        ? `${matched.length}件見つかりました（先頭${MAX_RESULTS}件を表示）`
        : `${matched.length}件見つかりました`;

    searchResults.innerHTML = "";
    shown.forEach(item => {
        const li = document.createElement("li");

        const pref = document.createElement("span");
        pref.className = "result-pref";
        pref.textContent = item.pref;

        const type = document.createElement("span");
        type.className = "result-type";
        type.textContent = item.type;
        pref.appendChild(type);

        const kana = document.createElement("p");
        kana.className = "result-kana";
        kana.lang = "ja";
        kana.textContent = item.kana;

        const name = document.createElement("p");
        name.className = "result-name";
        name.lang = "ja";
        name.textContent = item.name;

        const romaji = document.createElement("p");
        romaji.className = "result-romaji";
        romaji.lang = "en";
        romaji.translate = false;
        romaji.textContent = item.romaji;

        const links = document.createElement("div");
        links.className = "result-links";
        [["観光", "🗺️"], ["グルメ", "🍜"], ["宿泊", "🏨"]].forEach(([keyword, icon]) => {
            const a = document.createElement("a");
            a.href = buildSearchLinkUrl(item, keyword);
            a.target = "_blank";
            a.rel = "noopener noreferrer";
            a.textContent = `${icon} ${keyword}`;
            links.appendChild(a);
        });

        // 地名（漢字）とリンク（観光/グルメ/宿泊）を横並びにする行
        const nameRow = document.createElement("div");
        nameRow.className = "result-name-row";
        nameRow.appendChild(name);
        nameRow.appendChild(links);

        li.appendChild(pref);
        li.appendChild(kana);
        li.appendChild(nameRow);
        li.appendChild(romaji);
        searchResults.appendChild(li);
    });
}

searchInput.addEventListener("input", () => renderResults(searchInput.value));

// ----- 手書き入力（Googleの手書き文字認識・非公式APIを使用） -----
const handwriteCanvas = document.getElementById("handwriteCanvas");
const handwriteUndoBtn = document.getElementById("handwriteUndoBtn");
const handwriteClearBtn = document.getElementById("handwriteClearBtn");
const handwriteStatus = document.getElementById("handwriteStatus");
const handwriteCandidates = document.getElementById("handwriteCandidates");

const hctx = handwriteCanvas.getContext("2d");
hctx.lineWidth = 4;
hctx.lineCap = "round";
hctx.lineJoin = "round";
hctx.strokeStyle = "#222";

let strokes = [];       // 確定したストロークの配列。各ストロークは {x:[], y:[], t:[]}
let currentStroke = null;
let isDrawing = false;
let recognizeTimer = null;

function getCanvasPos(e) {
    const rect = handwriteCanvas.getBoundingClientRect();
    const scaleX = handwriteCanvas.width / rect.width;
    const scaleY = handwriteCanvas.height / rect.height;
    return {
        x: (e.clientX - rect.left) * scaleX,
        y: (e.clientY - rect.top) * scaleY
    };
}

function redrawStrokes() {
    hctx.clearRect(0, 0, handwriteCanvas.width, handwriteCanvas.height);
    strokes.forEach(s => {
        hctx.beginPath();
        s.x.forEach((x, i) => {
            if (i === 0) hctx.moveTo(x, s.y[i]);
            else hctx.lineTo(x, s.y[i]);
        });
        hctx.stroke();
    });
}

handwriteCanvas.addEventListener("pointerdown", (e) => {
    handwriteCanvas.setPointerCapture(e.pointerId);
    isDrawing = true;
    clearTimeout(recognizeTimer);
    const pos = getCanvasPos(e);
    currentStroke = { x: [pos.x], y: [pos.y], t: [Date.now()] };
    hctx.beginPath();
    hctx.moveTo(pos.x, pos.y);
});

handwriteCanvas.addEventListener("pointermove", (e) => {
    if (!isDrawing) return;
    const pos = getCanvasPos(e);
    currentStroke.x.push(pos.x);
    currentStroke.y.push(pos.y);
    currentStroke.t.push(Date.now());
    hctx.lineTo(pos.x, pos.y);
    hctx.stroke();
});

function endStroke() {
    if (!isDrawing) return;
    isDrawing = false;
    if (currentStroke && currentStroke.x.length > 1) {
        strokes.push(currentStroke);
    }
    currentStroke = null;
    // 少し待ってから認識をかける（続けて次の画を書く時間を確保する）
    clearTimeout(recognizeTimer);
    recognizeTimer = setTimeout(recognizeHandwriting, 600);
}

handwriteCanvas.addEventListener("pointerup", endStroke);
handwriteCanvas.addEventListener("pointercancel", endStroke);

handwriteUndoBtn.addEventListener("click", () => {
    strokes.pop();
    redrawStrokes();
    if (strokes.length > 0) {
        clearTimeout(recognizeTimer);
        recognizeTimer = setTimeout(recognizeHandwriting, 300);
    } else {
        handwriteCandidates.innerHTML = "";
        handwriteStatus.textContent = "枠の中に文字を書いてください";
    }
});

handwriteClearBtn.addEventListener("click", () => {
    strokes = [];
    redrawStrokes();
    handwriteCandidates.innerHTML = "";
    handwriteStatus.textContent = "枠の中に文字を書いてください";
});

async function recognizeHandwriting() {
    if (strokes.length === 0) return;
    handwriteStatus.textContent = "認識中…";
    handwriteCandidates.innerHTML = "";

    const ink = strokes.map(s => [s.x, s.y, s.t.map(t => t - s.t[0])]);

    try {
        const res = await fetch(
            "https://inputtools.google.com/request?ime=handwriting&app=mobilesearch&cs=1&oe=UTF-8",
            {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    options: "enable_pre_space",
                    requests: [{
                        writing_guide: {
                            writing_area_width: handwriteCanvas.width,
                            writing_area_height: handwriteCanvas.height
                        },
                        ink: ink,
                        language: "ja"
                    }]
                })
            }
        );
        const data = await res.json();
        const candidates = data && data[0] === "SUCCESS" && data[1] && data[1][0] && data[1][0][1];

        if (candidates && candidates.length > 0) {
            handwriteStatus.textContent = "候補をタップしてください";
            candidates.slice(0, 10).forEach(ch => {
                const btn = document.createElement("button");
                btn.type = "button";
                btn.className = "handwrite-candidate";
                btn.textContent = ch;
                btn.addEventListener("click", () => {
                    searchInput.value += ch;
                    renderResults(searchInput.value);
                    searchInput.focus();
                });
                handwriteCandidates.appendChild(btn);
            });
        } else {
            handwriteStatus.textContent = "認識できませんでした。もう少し大きく書いてみてください";
        }
    } catch (e) {
        handwriteStatus.textContent = "認識に失敗しました（通信環境やAPI仕様変更の影響かもしれません）";
    }
}

// URLに ?q=名護 のようなクエリが付いていれば、最初からその検索状態で開く
const initialQuery = new URLSearchParams(location.search).get("q");
if (initialQuery) {
    searchInput.value = initialQuery;
    renderResults(initialQuery);
}
