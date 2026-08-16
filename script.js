// municipalities.js で定義された `municipalities` 配列を使用する

const button = document.getElementById("rouletteButton");
const resultName = document.getElementById("resultName");
const resultKana = document.getElementById("resultKana");
const resultPref = document.getElementById("resultPref");
const resultRomaji = document.getElementById("resultRomaji");
const regionSelect = document.getElementById("regionSelect");
const prefSelect = document.getElementById("prefSelect");
const typeChecks = document.querySelectorAll(".typeCheck");
const matchCount = document.getElementById("matchCount");
const japanMap = document.getElementById("japanMap");
const historyList = document.getElementById("historyList");
const favoriteButton = document.getElementById("favoriteButton");
const shareButton = document.getElementById("shareButton");
const shareStatus = document.getElementById("shareStatus");
const favoritesList = document.getElementById("favoritesList");
const favoritesEmpty = document.getElementById("favoritesEmpty");
const historyEmpty = document.getElementById("historyEmpty");
const tabButtons = document.querySelectorAll(".tabBtn");
const tabPanels = document.querySelectorAll(".tabPanel");
const modeCityRadio = document.getElementById("modeCity");
const modePrefRadio = document.getElementById("modePref");
const cityOnlyFilters = document.getElementById("cityOnlyFilters");

// 都道府県名 -> 地図SVGの data-code の対応表（PREF_NAMESの並び順=コード1〜47から自動生成）
const prefCodeMap = {};
PREF_NAMES.forEach((name, i) => { prefCodeMap[name] = i + 1; });

// ----- 効果音（Web Audio API。音声ファイル不要） -----
let audioCtx = null;
function getAudioCtx() {
    if (!audioCtx) {
        const AC = window.AudioContext || window.webkitAudioContext;
        audioCtx = new AC();
    }
    if (audioCtx.state === "suspended") audioCtx.resume();
    return audioCtx;
}

function playTick(freq) {
    try {
        const ctx = getAudioCtx();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = "square";
        osc.frequency.value = freq;
        gain.gain.setValueAtTime(0.06, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.06);
        osc.connect(gain).connect(ctx.destination);
        osc.start();
        osc.stop(ctx.currentTime + 0.07);
    } catch (e) { /* 音声再生に失敗しても無視 */ }
}

function playLandingChime() {
    try {
        const ctx = getAudioCtx();
        const notes = [880, 1108.7, 1318.5]; // ラ・ド#・ミ の軽い和音アルペジオ
        notes.forEach((freq, i) => {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.type = "sine";
            osc.frequency.value = freq;
            const start = ctx.currentTime + i * 0.09;
            gain.gain.setValueAtTime(0.0001, start);
            gain.gain.exponentialRampToValueAtTime(0.12, start + 0.02);
            gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.5);
            osc.connect(gain).connect(ctx.destination);
            osc.start(start);
            osc.stop(start + 0.55);
        });
    } catch (e) { /* 音声再生に失敗しても無視 */ }
}

// ----- フィルタ -----

// 都道府県セレクトを地方に応じて作る
function buildPrefOptions(region) {
    const prefs = [...new Set(
        municipalities
            .filter(m => !region || prefRegionByCode(m.p) === region)
            .map(m => prefNameByCode(m.p))
    )];

    prefSelect.innerHTML = '<option value="">すべて</option>';
    prefs.forEach(pref => {
        const opt = document.createElement("option");
        opt.value = pref;
        opt.textContent = pref;
        prefSelect.appendChild(opt);
    });
}

// 都道府県コード（1〜47）から名前・かな・ローマ字・地方を引く
function prefNameByCode(code) { return PREF_NAMES[code - 1]; }
function prefKanaByCode(code) { return PREF_KANA[code - 1]; }
function prefRomajiByCode(code) { return PREF_ROMAJI[code - 1]; }
function prefRegionByCode(code) { return PREF_REGION[code - 1]; }

// 現在「都道府県だけ」モードかどうか
function isPrefMode() {
    return modePrefRadio.checked;
}

// 現在の条件に合う候補を返す（市区町村モード or 都道府県だけモード）。
// municipalities.js側はデータ量を減らすため短縮キー(n,k,r,p,t)で持っているので、
// ここで扱いやすいフルネームのオブジェクトに組み立て直す。
function getFiltered() {
    const region = regionSelect.value;

    if (isPrefMode()) {
        // 都道府県そのものを候補にする（pref === name として扱う）
        const codes = [...Array(PREF_NAMES.length).keys()].map(i => i + 1);
        return codes
            .filter(code => !region || prefRegionByCode(code) === region)
            .map(code => ({
                name: prefNameByCode(code), kana: prefKanaByCode(code), romaji: prefRomajiByCode(code),
                pref: prefNameByCode(code), region: prefRegionByCode(code), type: "県"
            }));
    }

    const pref = prefSelect.value;
    const activeTypes = [...typeChecks]
        .filter(c => c.checked)
        .map(c => c.value);

    return municipalities
        .filter(m => {
            if (region && prefRegionByCode(m.p) !== region) return false;
            if (pref && prefNameByCode(m.p) !== pref) return false;
            if (!activeTypes.includes(m.t)) return false;
            return true;
        })
        .map(m => ({
            name: m.n, kana: m.k, romaji: m.r,
            pref: prefNameByCode(m.p), region: prefRegionByCode(m.p), type: m.t
        }));
}

// モード切り替え
function applyMode() {
    const prefMode = isPrefMode();
    cityOnlyFilters.classList.toggle("disabled", prefMode);
    updateStatus();
}

modeCityRadio.addEventListener("change", applyMode);
modePrefRadio.addEventListener("change", applyMode);

// 該当件数を表示し、ボタンの有効/無効を切り替える
function updateStatus() {
    const filtered = getFiltered();
    matchCount.textContent = `該当: ${filtered.length}件`;
    button.disabled = filtered.length === 0;
}

// 地方が変わったら都道府県リストを作り直す
regionSelect.addEventListener("change", () => {
    buildPrefOptions(regionSelect.value);
    updateStatus();
});

prefSelect.addEventListener("change", updateStatus);
typeChecks.forEach(c => c.addEventListener("change", updateStatus));

// ----- 地図ハイライト -----

function highlightPref(prefName, className) {
    japanMap.querySelectorAll(".prefecture.active, .prefecture.landed")
        .forEach(el => el.classList.remove("active", "landed"));
    const code = prefCodeMap[prefName];
    if (!code) return;
    const el = japanMap.querySelector(`[data-code="${code}"]`);
    if (el) el.classList.add(className);
}

function clearHighlight() {
    japanMap.querySelectorAll(".prefecture.active, .prefecture.landed")
        .forEach(el => el.classList.remove("active", "landed"));
}

let currentPick = null;

function showResult(picked) {
    currentPick = picked;
    if (picked.pref === picked.name) {
        // 都道府県だけモードでは、都道府県名バッジは名前と重複するので隠す
        resultPref.style.visibility = "hidden";
    } else {
        resultPref.textContent = picked.pref;
        resultPref.style.visibility = "visible";
    }
    resultKana.textContent = picked.kana;
    resultName.textContent = picked.name;
    resultRomaji.textContent = picked.romaji;
    favoriteButton.disabled = false;
    shareButton.disabled = false;
    shareStatus.textContent = "\u00A0";
    updateFavoriteButtonState();
}

function clearResult(text) {
    currentPick = null;
    resultPref.textContent = "\u00A0";
    resultPref.style.visibility = "hidden";
    resultKana.textContent = "\u00A0";
    resultName.textContent = text;
    resultRomaji.textContent = "\u00A0";
    favoriteButton.disabled = true;
    shareButton.disabled = true;
    favoriteButton.classList.remove("is-favorited");
    shareStatus.textContent = "\u00A0";
}

// ----- 履歴 -----
const history = [];
const MAX_HISTORY = 15;

function addHistory(picked) {
    history.unshift(picked);
    if (history.length > MAX_HISTORY) history.pop();
    renderHistory();
}

function renderHistory() {
    historyList.innerHTML = "";
    historyEmpty.style.display = history.length === 0 ? "block" : "none";
    history.forEach(item => {
        const li = document.createElement("li");
        const main = document.createElement("span");
        main.textContent = item.pref === item.name
            ? `${item.name}（${item.kana}）`
            : `${item.pref} ${item.name}（${item.kana}）`;
        const sub = document.createElement("span");
        sub.className = "h-romaji";
        sub.textContent = item.romaji;
        li.appendChild(main);
        li.appendChild(sub);
        historyList.appendChild(li);
    });
}

// ----- タブ切り替え（履歴 / お気に入り） -----
tabButtons.forEach(btn => {
    btn.addEventListener("click", () => {
        tabButtons.forEach(b => b.classList.toggle("active", b === btn));
        const target = btn.dataset.tab;
        tabPanels.forEach(p => p.classList.toggle("active", p.id === `${target}Panel`));
    });
});

// ----- お気に入り（ブラウザに保存され、次回開いたときも残る） -----
const FAVORITES_KEY = "municipalityRouletteFavorites";

function loadFavorites() {
    try {
        const raw = localStorage.getItem(FAVORITES_KEY);
        return raw ? JSON.parse(raw) : [];
    } catch (e) {
        return [];
    }
}

function saveFavorites() {
    try {
        localStorage.setItem(FAVORITES_KEY, JSON.stringify(favorites));
    } catch (e) { /* 保存できない環境（プライベートモード等）では無視 */ }
}

let favorites = loadFavorites();

function isFavorited(item) {
    return favorites.some(f => f.name === item.name && f.pref === item.pref);
}

function updateFavoriteButtonState() {
    if (!currentPick) return;
    favoriteButton.classList.toggle("is-favorited", isFavorited(currentPick));
}

function toggleFavorite() {
    if (!currentPick) return;
    const idx = favorites.findIndex(f => f.name === currentPick.name && f.pref === currentPick.pref);
    if (idx >= 0) {
        favorites.splice(idx, 1);
    } else {
        favorites.unshift(currentPick);
    }
    saveFavorites();
    updateFavoriteButtonState();
    renderFavorites();
}

function removeFavorite(item) {
    favorites = favorites.filter(f => !(f.name === item.name && f.pref === item.pref));
    saveFavorites();
    updateFavoriteButtonState();
    renderFavorites();
}

function renderFavorites() {
    favoritesList.innerHTML = "";
    favoritesEmpty.style.display = favorites.length === 0 ? "block" : "none";
    favorites.forEach(item => {
        const li = document.createElement("li");

        const nameSpan = document.createElement("span");
        nameSpan.className = "f-name";
        nameSpan.textContent = item.pref === item.name
            ? `${item.name}（${item.kana}）`
            : `${item.pref} ${item.name}（${item.kana}）`;

        const romajiSpan = document.createElement("span");
        romajiSpan.className = "f-romaji";
        romajiSpan.textContent = item.romaji;

        const removeBtn = document.createElement("button");
        removeBtn.type = "button";
        removeBtn.textContent = "✕";
        removeBtn.setAttribute("aria-label", `${item.name}をお気に入りから削除`);
        removeBtn.addEventListener("click", () => removeFavorite(item));

        li.appendChild(nameSpan);
        li.appendChild(romajiSpan);
        li.appendChild(removeBtn);
        favoritesList.appendChild(li);
    });
}

favoriteButton.addEventListener("click", toggleFavorite);

// ----- 共有 -----
function buildShareText(item) {
    if (item.pref === item.name) {
        return `市町村ルーレットで「${item.name}（${item.romaji}）」が当たりました！`;
    }
    return `市町村ルーレットで「${item.pref} ${item.name}（${item.romaji}）」が当たりました！`;
}

async function shareResult() {
    if (!currentPick) return;
    const text = buildShareText(currentPick);

    if (navigator.share) {
        try {
            await navigator.share({ text });
            return;
        } catch (e) {
            if (e && e.name === "AbortError") return; // キャンセル時は何もしない
        }
    }

    // Web Share APIが無い環境（PCのブラウザ等）ではクリップボードにコピー
    try {
        await navigator.clipboard.writeText(text);
        shareStatus.textContent = "結果をコピーしました";
    } catch (e) {
        shareStatus.textContent = text;
    }
}

shareButton.addEventListener("click", shareResult);

// ----- ルーレット本体 -----

// ルーレットのように高速→減速しながら地図上をピコピコ切り替えて、最後に結果へ着地する
function spinRoulette(filtered, finalPick) {
    button.disabled = true;
    favoriteButton.disabled = true;
    shareButton.disabled = true;
    favoriteButton.classList.remove("is-favorited");
    shareStatus.textContent = "\u00A0";

    const totalSteps = 22; // ピコピコの回数
    let step = 0;

    // だんだん遅くなる間隔（最初は速く、最後はゆっくり）
    function delayForStep(i) {
        const progress = i / totalSteps; // 0 -> 1
        const eased = progress * progress; // 加速度的に遅くする
        return 40 + eased * 260; // 40ms 〜 300ms
    }

    function tick() {
        if (step >= totalSteps) {
            // 最終着地
            highlightPref(finalPick.pref, "landed");
            showResult(finalPick);
            playLandingChime();
            addHistory(finalPick);
            button.disabled = false;
            return;
        }

        const candidate = filtered[Math.floor(Math.random() * filtered.length)];
        highlightPref(candidate.pref, "active");
        if (candidate.pref === candidate.name) {
            resultPref.style.visibility = "hidden";
        } else {
            resultPref.textContent = candidate.pref;
            resultPref.style.visibility = "visible";
        }
        resultKana.textContent = "\u00A0";
        resultName.textContent = candidate.name;
        resultRomaji.textContent = "\u00A0";
        playTick(300 + Math.random() * 300);

        step++;
        setTimeout(tick, delayForStep(step));
    }

    tick();
}

function spin() {
    if (button.disabled) return;
    const filtered = getFiltered();
    if (filtered.length === 0) {
        clearHighlight();
        clearResult("該当なし");
        return;
    }
    const finalPick = filtered[Math.floor(Math.random() * filtered.length)];
    spinRoulette(filtered, finalPick);
}

button.addEventListener("click", spin);

// ----- キーボード操作対応 -----
// フォーム部品（select/checkbox）を操作中は通常のキー操作を邪魔しないようにする
document.addEventListener("keydown", (e) => {
    if (e.key !== "Enter") return;
    const tag = document.activeElement ? document.activeElement.tagName : "";
    if (tag === "SELECT" || tag === "INPUT") return;
    e.preventDefault();
    spin();
});

// 初期化
buildPrefOptions("");
applyMode();
updateStatus();
renderHistory();
renderFavorites();
