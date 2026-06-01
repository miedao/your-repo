const EXTENSION_NAME = 'your-repo';
const BASE_URL = new URL('./', import.meta.url).href;

let gameState = { hr: 72, sus: 0, active: false, arrested: false, isProcessing: false };

const defaultSettings = {
    enabled: true,
    apiMode: 'internal',
    apiUrl: '',
    apiKey: '',
    apiModel: ''
};

// =======================
// Fallback Reaction Pool (27 items)
// =======================
const fallbackReactions = {
    "摸摸头": [
        { reaction: "*随着你的动作，他感觉到头顶传来一阵温柔的抚摸，不自觉地眯起眼睛，呼吸变得平缓。*", sus_add: 1 },
        { reaction: "*他的头发似乎被人揉乱了，他有些不满地皱了皱眉，伸手去理了理头发，眼神却流露出一丝疑惑。*", sus_add: 2 },
        { reaction: "*当你的手落在娃娃头上时，他感觉到一只无形的手轻轻顺着他的头发，身体微微放松，嘴角轻微上扬。*", sus_add: 1 }
    ],
    "捏捏手": [
        { reaction: "*他的手指突然感觉到一阵轻微的压迫感，仿佛有人在捏他的指节，他下意识地蜷缩了一下手指。*", sus_add: 1 },
        { reaction: "*他感觉到手背被温柔地摩挲着，温度似乎从虚无中传来，让他忍不住看向自己的掌心。*", sus_add: 2 },
        { reaction: "*就像是被十指相扣一样，他的手掌感受到一种亲密的包裹感，呼吸稍微乱了一拍。*", sus_add: 3 }
    ],
    "亲亲脸": [
        { reaction: "*他的脸颊突然感觉到一阵湿润温热的触感，他猛地睁大眼睛，耳根悄悄泛起了一丝薄红。*", sus_add: 3 },
        { reaction: "*仿佛有人在他的额头上落下了一个轻吻，他愣了一下，不自在地偏过头，轻咳了一声。*", sus_add: 2 },
        { reaction: "*他的嘴角感觉到了柔软的触碰，心跳骤然加快，眼神开始不自觉地在四周游移寻找。*", sus_add: 4 }
    ],
    "戳戳腰": [
        { reaction: "*他感觉到腰侧被一根手指轻轻戳了一下，身体极其敏感地瑟缩了一下，闷哼出声。*", sus_add: 3 },
        { reaction: "*那股轻揉腰际的触感让他浑身一僵，他不自然地挺直了背脊，脸色变得有些古怪。*", sus_add: 2 },
        { reaction: "*随着腰部传来的异样触感，他咬了咬下唇，强忍住差点溢出的喘息，目光变得危险起来。*", sus_add: 4 }
    ],
    "拍拍背": [
        { reaction: "*后背传来的轻拍节奏让他感到一种莫名的安心感，原本紧绷的肩背逐渐放松下来。*", sus_add: 1 },
        { reaction: "*就像是被人顺毛撸一样，他感觉到背脊一阵酥麻，有些慵懒地眯起了眼，喉咙里发出细微的声响。*", sus_add: 2 },
        { reaction: "*背后突如其来的触感让他下意识地回过头去，却什么也没看到，眼中闪过一丝狐疑。*", sus_add: 3 }
    ],
    "拥抱娃娃": [
        { reaction: "*他突然感觉到一种被完全包裹的温暖感，仿佛被人紧紧抱在怀里，心跳不可抑止地加快。*", sus_add: 4 },
        { reaction: "*从背后环抱而来的虚拟触感让他浑身一震，他屏住了呼吸，双手不自觉地握成了拳头。*", sus_add: 5 },
        { reaction: "*那股窒息般的拥抱感让他感到心慌又沉溺，他不自觉地往后靠了靠，仿佛想要贴近那个不存在的怀抱。*", sus_add: 4 }
    ],
    "捏捏耳朵": [
        { reaction: "*他的耳垂突然感觉到一阵轻捏的触感，耳朵立刻红得像要滴血，他恼羞成怒地捂住了耳朵。*", sus_add: 4 },
        { reaction: "*仿佛有一阵热气吹拂进耳朵里，他浑身像触电般一颤，腿甚至有瞬间的发软。*", sus_add: 5 },
        { reaction: "*耳尖传来的温润触感让他整个人僵在原地，眼神变得极度不自然，呼吸也变得急促起来。*", sus_add: 4 }
    ],
    "拉衣角": [
        { reaction: "*他感觉到衣摆被人轻轻扯动了一下，低头看了看，明明什么都没有，怀疑的种子在心里生根。*", sus_add: 2 },
        { reaction: "*指尖探入衣摆的触感让他倒吸了一口凉气，一把抓住了自己的衣服下摆，四下张望。*", sus_add: 5 },
        { reaction: "*感觉到衣领被整理，他愣怔了片刻，随即露出了一个无奈又有些纵容的浅笑。*", sus_add: 1 }
    ],
    "自定义高能动作": [
        { reaction: "*脖颈处传来一阵极具占有欲的蹭弄，他终于无法维持平静，深吸一口气，眼神变得极具侵略性。*", sus_add: 5 },
        { reaction: "*掌心仿佛被人用指尖轻轻划过写字，酥痒感直达心脏，他紧紧握住了拳头，暗暗咬牙。*", sus_add: 5 },
        { reaction: "*指尖传来的微痛与湿润交织的触感，让他直接闭上了眼睛，喉结重重地上下滚动了一番。*", sus_add: 5 }
    ]
};

const highEnergyActions = [
    "蹭蹭脖子", "在掌心写字", "轻咬指尖", "把手探入下摆", "贴近耳边吹气", "跨坐在腿上", "用力抱紧", "顺着脊椎抚摸"
];

function getContextSafe() {
    if (typeof getContext === 'function') return getContext();
    if (window.getContext) return window.getContext();
    if (window.SillyTavern && typeof window.SillyTavern.getContext === 'function') return window.SillyTavern.getContext();
    return {};
}

function getSettings() {
    const context = getContextSafe();
    if (context && context.extension_settings) {
        context.extension_settings[EXTENSION_NAME] = context.extension_settings[EXTENSION_NAME] || {};
        return context.extension_settings[EXTENSION_NAME];
    }
    window.tgww_settings = window.tgww_settings || {};
    return window.tgww_settings;
}

function loadSettings() {
    const settingsObj = getSettings();
    Object.assign(settingsObj, {
        ...defaultSettings,
        ...settingsObj,
    });
    return settingsObj;
}

function saveSettings() {
    const context = getContextSafe();
    if (context && context.saveSettingsDebounced) {
        context.saveSettingsDebounced();
    } else if (typeof window.saveSettingsDebounced === 'function') {
        window.saveSettingsDebounced();
    }
}

function addLog(actionStr, reactionStr) {
    const $ = window.jQuery;
    if (!$) return;
    const logs = $('#tgww_logs');
    const entry = $('<div class="tgww-log-entry"></div>');
    entry.append($('<div class="tgww-log-action"></div>').text(`> ${actionStr}`));
    entry.append($('<span class="tgww-log-reaction"></span>').text(reactionStr));
    logs.append(entry);
    logs.scrollTop(logs[0].scrollHeight);
}

function showToast(msg) {
    const $ = window.jQuery;
    if (!$) return;
    const toast = $('#tgww_toast');
    toast.text(msg).css({ opacity: 1, transform: 'translate(-50%, 0)' });
    setTimeout(() => {
        toast.css({ opacity: 0, transform: 'translate(-50%, -10px)' });
    }, 3000);
}

function updateUI() {
    const $ = window.jQuery;
    if (!$) return;
    
    // Animate HR randomly close to target
    $('#tgww_hr_val').text(gameState.hr + Math.floor(Math.random()*3 - 1));
    $('#tgww_suspicion_val').text(gameState.sus);
    $('#tgww_suspicion_bar').css('width', `${gameState.sus}%`);
    
    const hrIcon = $('.tgww-hr-icon');
    if(gameState.hr > 120) {
        hrIcon.css('animation-duration', '0.4s');
        hrIcon.css('color', '#ef4444');
    } else if(gameState.hr > 90) {
        hrIcon.css('animation-duration', '0.7s');
        hrIcon.css('color', '#f87171');
    } else {
        hrIcon.css('animation-duration', '1.2s');
        hrIcon.css('color', '#ff3344');
    }

    if(gameState.sus > 80) $('#tgww_suspicion_bar').css('background', '#ef4444');
    else if(gameState.sus > 50) $('#tgww_suspicion_bar').css('background', '#eab308');
    else $('#tgww_suspicion_bar').css('background', '#4ade80');
}

async function callLLM(systemPrompt, userPrompt) {
    const settings = loadSettings();
    let resultText = "";
    
    // First try custom API
    if (settings.apiMode === 'custom' && settings.apiUrl && settings.apiKey) {
        try {
            const bodyPayload = {
                model: settings.apiModel || "gpt-3.5-turbo",
                messages: [
                    { role: "system", content: systemPrompt },
                    { role: "user", content: userPrompt }
                ],
                temperature: 0.8
            };
            
            const res = await fetch(settings.apiUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${settings.apiKey}`
                },
                body: JSON.stringify(bodyPayload)
            });
            const data = await res.json();
            if (data.choices && data.choices[0] && data.choices[0].message) {
                resultText = data.choices[0].message.content;
            }
        } catch(e) {
            console.error("[tgww] Custom API failed:", e);
        }
    } 
    
    // Fallback to internal SillyTavern API if no result
    if (!resultText) {
        try {
            const fullPrompt = systemPrompt + "\n\nUser Request: " + userPrompt + "\n\nOUTPUT ONLY PURE JSON FORMAT, no markdown blocks.";
            if (typeof window.generateRaw === 'function') {
                resultText = await window.generateRaw(fullPrompt, true);
            } else if (typeof window.SillyTavern?.getContext().generateRaw === 'function') {
                resultText = await window.SillyTavern.getContext().generateRaw(fullPrompt, true);
            } else {
                console.warn("[tgww] No internal LLM function found.");
            }
        } catch(e) {
            console.error("[tgww] Internal API failed:", e);
        }
    }
    
    if (!resultText) return null;
    
    // Safely parse JSON even if surrounded by markdown codeblocks
    try {
        let cleanText = resultText.trim();
        if (cleanText.startsWith("```")) {
            cleanText = cleanText.replace(/^```[a-z]*\n/, '').replace(/\n```$/, '');
        }
        const match = cleanText.match(/\{[\s\S]*\}/);
        if (match) return JSON.parse(match[0]);
        return JSON.parse(cleanText);
    } catch(e) {
        console.error("[tgww] Failed to parse JSON:", resultText);
        return null; // Return null so we can use the fallback pool!
    }
}

function getCharacterContext() {
    const context = getContextSafe();
    let charName = '他';
    let charPersona = '傲娇/敏感';
    let userName = '你';
    
    if (context.characters && context.characterId !== undefined && context.characters[context.characterId]) {
        const ch = context.characters[context.characterId];
        charName = ch.name || charName;
        charPersona = ch.description || ch.personality || charPersona;
    }
    if (context.name1) userName = context.name1;
    return { charName, charPersona, userName };
}

async function handleArrest(charName, charPersona, userName) {
    const $ = window.jQuery;
    $('#tgww_loading').html('<i class="fa-solid fa-spinner fa-spin"></i> 信号逆向追踪中...').css('display', 'flex');
    
    const sysPrompt = `你正在为一个互动游戏写"逮捕"剧情。
背景: User通过共感娃娃一直触摸${charName}，怀疑度达到100%，${charName}的本体顺着连接抓到了User。
角色性格: ${charPersona}。请深度读取并符合角色性格，绝对不可OOC！涉及的所有台词不得重复，如有涉及nsfw内容必须完整输出。
要求:
1) ${charName}的声音/文字出场方式(带有"抓到你了"的压迫感与暧昧，不少于80字)。
2) 对User的"教育"内容(不少于400字，包括质问为什么一直碰娃娃、解释共感原理、表达真实感受及惩罚措施，教育方式根据性格设定)。
格式要求:
- 独立番外禁止生成正文剧情和状态栏，直接生成HTML。
- 代码间绝对禁止生成空行，所有样式必须内联。
- 全程第三人称描写${charName}，第二人称描写${userName}。
- 请直接输出纯内部HTML内容，不要加外层标签，不要使用Markdown代码块。`;
    
    let story = await callLLM(sysPrompt, `请生成逮捕剧情HTML文本。`);
    
    // Fallback if API fails
    if (!story || typeof story === 'object') {
        story = `*门铃猝不及防地响起，还未等你起身，门已经被外力猛地推开。${charName}阴沉着脸站在门口，目光紧紧锁定着你，一步步将你逼入角落。他的眼神中带着一种危险而压抑的笑意，声音低哑：“找到你了...你以为你对那个娃娃做的事，我感觉不到吗？”* \n\n他一把夺过你手中的共感娃娃，随意扔在地上，转而捏住了你的下巴，迫使你抬头与他对视。“说吧，为什么要一直碰它？你知道我这边是什么感受吗...”他惩罚性地咬了一下你的唇角，开始了漫长的“教育”...`;
    }
    
    gameState.arrested = true;
    gameState.active = false;
    $('#tgww_main').removeClass('active');
    $('#tgww_arrest').addClass('active');
    $('#tgww_arrest_text').html(story);
    
    // Unlock Easter Egg
    const eggBtn = $('#tgww_btn_easter_egg');
    eggBtn.show();
    eggBtn.off('click').on('click', async function() {
        $(this).hide();
        $('#tgww_loading').html('<i class="fa-solid fa-spinner fa-spin"></i> 提取余温记忆...').css('display', 'flex');
        
        const eggPrompt = `生成"娃娃的余温"彩蛋剧情(不少于150字)。
背景: 逮捕剧情结束后，${charName}私底下偷偷检查娃娃，并自言自语说了一句关于${userName}的话。符合性格: ${charPersona}。
格式要求: 
- 直接生成HTML，代码间绝对禁止生成空行，所有样式必须内联。
- 不要加外层标签，不要Markdown代码块。`;
        let eggStory = await callLLM(eggPrompt, "请生成彩蛋剧情。");
        if (!eggStory || typeof eggStory === 'object') {
            eggStory = `*在你沉睡的深夜里，${charName}独自坐在床边，捡起了那个被丢在地上的共感娃娃。他修长的指尖轻轻摩挲着娃娃的头顶和脸颊，似乎在回忆着白天从连接端传来的那一阵阵酥麻触感。他的嘴角勾起一抹连自己都没察觉到的温柔弧度，轻笑了一声：“真是个毫无防备又胆大妄为的家伙...下次，可不会这么轻易放过你了。”*`;
        }
        
        $('#tgww_easter_egg_text').html(eggStory).css('opacity', 1);
        $('#tgww_loading').hide();
    });
    
    $('#tgww_loading').hide();
    showToast("怀疑度已归零...但他已经知道你在做什么了。");
}

async function generateReaction(action) {
    const $ = window.jQuery;
    if (!$) return;
    if (gameState.arrested || !gameState.active || gameState.isProcessing) return;
    
    gameState.isProcessing = true;
    let actualAction = action;
    if (action === "自定义高能动作") {
        actualAction = highEnergyActions[Math.floor(Math.random() * highEnergyActions.length)];
    }

    $('#tgww_loading').html('<i class="fa-solid fa-spinner fa-spin"></i> 分析反馈中...').css('display', 'flex');
    
    try {
        const { charName, charPersona, userName } = getCharacterContext();
        
        const sysPrompt = `你正在运行一个叫【共感娃娃】的互动游戏实验。
当前角色(${charName})性格: ${charPersona}。玩家(${userName})。
设定: ${charName}和${userName}是恋人。玩家刚刚对共感娃娃执行了动作:【${actualAction}】。${charName}会真实感受到这个触碰。
你必须返回一个严格合法的JSON对象，不要Markdown代码块，格式如下:
{"sus_add": <整数1到5，根据动作亲密程度决定>,"reaction": "<至少40字的文本>"}
反应文本要求:
1) 需包含身体感受描述(如"脖子后面一麻")和语言/非语言回应。
2) 体现"共感"特性(精准说出碰了哪里)。
3) 结合合理的心跳变化。
4) 禁止重复使用相同句式。
5) 必须直接生成带内联样式的HTML(如<span style="color:#f87171">等)，代码间绝对禁止空行。
6) ${charName}使用第三人称，${userName}使用第二人称。`;
        
        let response = await callLLM(sysPrompt, `玩家动作：${actualAction}。请生成严格的JSON反馈。`);
        
        // 核心修复：如果 LLM API 失败，从丰富的备用库中随机抽取！
        if (!response || !response.reaction) {
            console.log("[tgww] LLM failed, using fallback pool for:", action);
            const pool = fallbackReactions[action] || fallbackReactions["摸摸头"];
            const randomPick = pool[Math.floor(Math.random() * pool.length)];
            
            response = {
                sus_add: randomPick.sus_add + (action === "自定义高能动作" ? 2 : 0),
                reaction: randomPick.reaction.replace(/他/g, charName).replace(/你/g, userName)
            };
        }
        
        let oldSus = gameState.sus;
        gameState.sus += response.sus_add;
        if(gameState.sus > 100) gameState.sus = 100;
        
        // HR Calculation (Dynamic based on sus)
        let minHr = 65, maxHr = 85;
        if (gameState.sus > 40) { minHr = 85; maxHr = 110; }
        if (gameState.sus > 75) { minHr = 110; maxHr = 135; }
        if (gameState.sus >= 100) { minHr = 140; maxHr = 160; }
        gameState.hr = Math.floor(Math.random() * (maxHr - minHr + 1)) + minHr;
        
        updateUI();
        
        let displayAction = action === "自定义高能动作" ? `高能动作 [${actualAction}]` : action;
        $('#tgww_summary').html(response.reaction);
        addLog(displayAction, response.reaction + ` (怀疑度 +${response.sus_add})`);

        if (gameState.sus >= 30 && oldSus < 30) showToast("预警 | 30%: 他似乎感觉到了什么...");
        if (gameState.sus >= 60 && oldSus < 60) showToast("警告 | 60%: 他看向了娃娃的方向...");
        if (gameState.sus >= 80 && oldSus < 80) showToast("危 | 80%: 他已经在找你了...");

        if(gameState.sus >= 100) {
            await handleArrest(charName, charPersona, userName);
        }
    } catch(e) {
        console.error("生成反应失败:", e);
        showToast("神经连接波动，请重试。");
    } finally {
        $('#tgww_loading').hide();
        gameState.isProcessing = false;
    }
}

// 模拟心跳波动
setInterval(() => {
    if (gameState.active && !gameState.arrested && !gameState.isProcessing) {
        const $ = window.jQuery;
        if ($ && $('#tgww_main').hasClass('active')) {
            let variance = Math.floor(Math.random() * 5) - 2;
            let currentHr = parseInt($('#tgww_hr_val').text()) || gameState.hr;
            let newHr = currentHr + variance;
            if(Math.abs(newHr - gameState.hr) > 5) newHr = gameState.hr; // keep near target
            $('#tgww_hr_val').text(newHr);
        }
    }
}, 2000);

async function initTgww() {
    console.log(`🚀 共感娃娃 v1.0.8 启动 - 全新实验舱模式`);
    const $ = window.jQuery;
    if (!$) return;
    
    const settingsObj = loadSettings();

    try {
        const settingsHtmlUrl = new URL('./settings.html', BASE_URL).href;
        const settingsHtml = await (await fetch(settingsHtmlUrl)).text();
        $('#extensions_settings').append(settingsHtml);
    } catch (e) {
        console.error('Failed to load settings.html', e);
    }

    // 绑定设置项事件
    const inputs = ['tgww_enabled', 'tgww_api_mode', 'tgww_api_url', 'tgww_api_key', 'tgww_api_model_list'];
    inputs.forEach(id => {
        const el = $(`#${id}`);
        if (!el.length) return;
        
        const key = id.replace('tgww_', '');
        if(el.is(':checkbox')) el.prop('checked', settingsObj[key]);
        else el.val(settingsObj[key] || '');
        
        el.on('change', function() {
            let val = $(this).is(':checkbox') ? $(this).prop('checked') : $(this).val();
            settingsObj[key] = val;
            saveSettings();
            
            if(id === 'tgww_api_mode') {
                if(val === 'custom') $('#tgww_custom_api_settings').slideDown();
                else $('#tgww_custom_api_settings').slideUp();
            }
        });
    });

    if(settingsObj.apiMode === 'custom') {
        $('#tgww_custom_api_settings').show();
    }

    // Bind Fetch Models Button
    $('body').on('click', '#tgww_btn_fetch_models', async function() {
        const urlStr = $('#tgww_api_url').val() || settingsObj.apiUrl;
        const key = $('#tgww_api_key').val() || settingsObj.apiKey;
        const notify = (msg, type='info') => { if(window.toastr) toastr[type](msg); else alert(msg); };
        
        if (!urlStr) {
            notify("请先输入 API URL", "error");
            return;
        }
        const btn = $(this);
        btn.html('<i class="fa-solid fa-spinner fa-spin"></i> 拉取中');
        try {
            // URL 修正：如果以 /chat/completions 结尾，替换为 /models
            let modelsUrl = urlStr;
            if (modelsUrl.endsWith('/chat/completions')) {
                modelsUrl = modelsUrl.replace('/chat/completions', '/models');
            } else if (!modelsUrl.endsWith('/models')) {
                if (modelsUrl.endsWith('/v1')) modelsUrl += '/models';
                else modelsUrl = modelsUrl.replace(/\/?$/, '/v1/models');
            }
            
            const res = await fetch(modelsUrl, {
                method: 'GET',
                headers: { 'Authorization': `Bearer ${key}` }
            });
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            const data = await res.json();
            if (data && data.data && Array.isArray(data.data)) {
                const list = $('#tgww_api_model_list');
                list.empty();
                data.data.forEach(m => {
                    const selected = m.id === settingsObj.apiModelList ? 'selected' : '';
                    list.append(`<option value="${m.id}" ${selected}>${m.id}</option>`);
                });
                notify(`成功拉取 ${data.data.length} 个模型`, "success");
                // Save if none selected
                if(!settingsObj.apiModelList && data.data.length > 0) {
                    settingsObj.apiModelList = data.data[0].id;
                    saveSettings();
                }
            } else {
                notify("未找到模型列表", "warning");
            }
        } catch (e) {
            console.error("Fetch models failed:", e);
            notify("拉取模型失败: " + e.message, "error");
        } finally {
            btn.html('<i class="fa-solid fa-cloud-arrow-down"></i> 拉取模型');
        }
    });

    // Bind Test Connection Button
    $('body').on('click', '#tgww_btn_test_conn', async function() {
        const urlStr = $('#tgww_api_url').val() || settingsObj.apiUrl;
        const key = $('#tgww_api_key').val() || settingsObj.apiKey;
        const model = $('#tgww_api_model_list').val() || settingsObj.apiModelList || "gpt-3.5-turbo";
        const notify = (msg, type='info') => { if(window.toastr) toastr[type](msg); else alert(msg); };

        if (!urlStr) {
            notify("请先输入 API URL", "error");
            return;
        }
        if (!model) {
            notify("请先选择或输入模型", "error");
            return;
        }
        
        const btn = $(this);
        btn.html('<i class="fa-solid fa-spinner fa-spin"></i> 测试中');
        try {
            const res = await fetch(urlStr, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${key}`
                },
                body: JSON.stringify({
                    model: model,
                    messages: [{ role: "user", content: "Hello, reply 'Connection OK' if you receive this." }],
                    max_tokens: 10
                })
            });
            if (!res.ok) {
                const txt = await res.text();
                throw new Error(`HTTP ${res.status}: ${txt}`);
            }
            const data = await res.json();
            if (data && data.choices && data.choices[0] && data.choices[0].message) {
                notify("连接测试成功！", "success");
            } else {
                notify("连接可能成功，但返回格式异常", "warning");
            }
        } catch (e) {
            console.error("Test connection failed:", e);
            notify("测试连接失败: " + e.message, "error");
        } finally {
            btn.html('<i class="fa-solid fa-plug"></i> 测试连接');
        }
    });

    try {
        const gameHtmlUrl = new URL('./game.html', BASE_URL).href;
        const gameHtml = await (await fetch(gameHtmlUrl)).text();
        $('body').append(gameHtml);
    } catch (e) {
        console.error('Failed to load game.html', e);
    }

    const wrapper = $('#tgww_wrapper');
    // 如果还没绑定点击事件，这里进行绑定（注意，jQuery 的 on 会叠加，但此时元素是新加入的）
    $('body').on('click', '#tgww_wrapper', function(e) {
        if(e.target === this) $(this).fadeOut(200);
    });

    $('body').on('click', '#tgww_btn_enter', () => {
        $('#tgww_cover').css('opacity', 0);
        setTimeout(() => {
            $('#tgww_cover').hide();
            $('#tgww_main').addClass('active');
            gameState.active = true;
        }, 500);
    });

    $('body').on('click', '.tgww-action-btn', function() {
        if (!gameState.active || gameState.arrested) return;
        const action = $(this).data('action');
        generateReaction(action);
    });

    $('body').on('click', '#tgww_btn_easter_egg', function() {
        $(this).hide();
        $('#tgww_easter_egg_text').css('opacity', 1);
    });

    $('body').on('click', '#tgww_btn_reset', () => {
        gameState = { hr: 72, sus: 0, active: true, arrested: false };
        $('#tgww_arrest').removeClass('active');
        $('#tgww_main').addClass('active');
        $('#tgww_logs').empty().append('<div class="tgww-log-entry" style="color: #666;">[SYSTEM] 记录已重置...重新开始收集实验数据。</div>');
        $('#tgww_summary').text('实验舱已重启，等待数据接入...');
        $('#tgww_easter_egg_text').css('opacity', 0);
        $('#tgww_btn_easter_egg').hide();
        updateUI();
    });

    const openGameUI = () => {
        const wrap = $('#tgww_wrapper');
        if (wrap && wrap.length) {
            wrap.fadeIn(200).css('display', 'flex');
        } else {
            console.warn('[tgww] #tgww_wrapper element not found. UI might not be loaded yet.');
        }
    };

    // 注入浮动按钮
    if (!document.getElementById('tgww_open_btn')) {
        const triggerBtn = document.createElement('div');
        triggerBtn.id = 'tgww_open_btn';
        triggerBtn.title = '共感娃娃番外实验舱';
        triggerBtn.innerHTML = '<i class="fa-solid fa-flask"></i>';
        triggerBtn.style.cssText = 'position:fixed; bottom:130px; right:35px; z-index:2147483647; background:rgba(17,19,20,0.9); color:#ff3344; width:45px; height:45px; border-radius:50%; display:flex; justify-content:center; align-items:center; cursor:pointer; box-shadow:0 0 15px rgba(255,51,68,0.4); border: 1px solid rgba(255,51,68,0.3); font-size:20px; transition:all 0.3s cubic-bezier(0.4, 0, 0.2, 1);';
        triggerBtn.onclick = openGameUI;
        triggerBtn.onmouseover = () => triggerBtn.style.transform = 'scale(1.1)';
        triggerBtn.onmouseout = () => triggerBtn.style.transform = 'scale(1)';
        document.body.appendChild(triggerBtn);
    }

    if (!document.getElementById('tgww_chat_btn')) {
        const chatInputBtn = document.createElement('div');
        chatInputBtn.id = 'tgww_chat_btn';
        chatInputBtn.className = 'mes_button';
        chatInputBtn.title = '共感娃娃番外';
        chatInputBtn.innerHTML = '<i class="fa-solid fa-flask"></i>';
        chatInputBtn.style.cssText = 'cursor:pointer; margin-left: 5px; color:#ff3344; font-size: 1.2em; display:flex; align-items:center; padding: 5px;';
        chatInputBtn.onclick = openGameUI;

        const formGroup = document.querySelector('#send_form #chat_and_send_buttons') || 
                          document.querySelector('#send_form #chat_buttons') || 
                          document.querySelector('#send_form .flex-container');
        if (formGroup) {
            formGroup.prepend(chatInputBtn);
        } else {
            const sendTextarea = document.getElementById('send_textarea');
            if (sendTextarea && sendTextarea.parentNode) {
                sendTextarea.parentNode.insertBefore(chatInputBtn, sendTextarea);
            }
        }
    }
        
    if (!document.getElementById('tgww_top_btn')) {
        const topMenuBtn = document.createElement('div');
        topMenuBtn.id = 'tgww_top_btn';
        topMenuBtn.className = 'menu_button';
        topMenuBtn.title = '共感娃娃番外';
        topMenuBtn.innerHTML = '<i class="fa-solid fa-flask" style="color:#ff3344;"></i> <span>共感娃娃</span>';
        topMenuBtn.style.cursor = 'pointer';
        topMenuBtn.onclick = openGameUI;
        
        const topMenu = document.querySelector('#extensionsMenu') || 
                        document.querySelector('#top-bar') || 
                        document.querySelector('.top-bar-extensions');
        if (topMenu) {
            topMenu.appendChild(topMenuBtn);
        }
    }

    try {
        if (typeof window.SlashCommandParser !== 'undefined' && window.SlashCommandParser.addCommandObject) {
            window.SlashCommandParser.addCommandObject(
                window.SlashCommandParser.addCommand('tgww', async () => {
                    openGameUI();
                    return '';
                }, [], '打开共感娃娃番外互动界面')
            );
        } else if (typeof registerSlashCommand === 'function') {
            registerSlashCommand('tgww', async () => {
                openGameUI();
                return '';
            }, [], '打开共感娃娃番外互动界面');
        }
    } catch (e) {
        console.warn("[tgww] 注册斜杠命令失败:", e);
    }
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initTgww);
} else {
    initTgww();
}
