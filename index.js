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

function updateUI() {
    const $ = window.jQuery;
    if (!$) return;
    $('#tgww_hr_val').text(gameState.hr);
    $('#tgww_suspicion_val').text(gameState.sus);
    $('#tgww_suspicion_bar').css('width', `${gameState.sus}%`);
    
    const hrIcon = $('.tgww-hr-icon');
    if(gameState.hr > 120) {
        hrIcon.css('animation', 'tgww-heartbeat 0.3s infinite alternate');
        hrIcon.css('color', '#ff0000');
    } else if(gameState.hr > 90) {
        hrIcon.css('animation', 'tgww-heartbeat 0.6s infinite alternate');
        hrIcon.css('color', '#ff5555');
    } else {
        hrIcon.css('animation', 'tgww-heartbeat 1s infinite alternate');
        hrIcon.css('color', '#ff8888');
    }

    if(gameState.sus > 80) $('#tgww_suspicion_bar').css('background', '#ff3333');
    else if(gameState.sus > 50) $('#tgww_suspicion_bar').css('background', '#ff9900');
    else $('#tgww_suspicion_bar').css('background', '#00f2fe');
}

const highEnergyActions = [
    "蹭蹭脖子", "在掌心写字", "轻咬指尖", "把手探入下摆", "贴近耳边吹气", "跨坐在腿上", "用力抱紧", "顺着脊椎抚摸"
];

async function callLLM(systemPrompt, userPrompt, forceJson = true) {
    const settings = loadSettings();
    let resultText = "";
    
    if (settings.apiMode === 'custom' && settings.apiUrl && settings.apiKey) {
        try {
            const bodyPayload = {
                model: settings.apiModel || "gpt-3.5-turbo",
                messages: [
                    { role: "system", content: systemPrompt },
                    { role: "user", content: userPrompt }
                ],
                temperature: 0.7
            };
            if (forceJson) bodyPayload.response_format = { type: "json_object" };
            
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
    } else {
        // Try internal API via generateRaw or similar fallback
        try {
            const fullPrompt = systemPrompt + "\n\nUser Request: " + userPrompt + (forceJson ? "\n\nOUTPUT PURE JSON FORMAT." : "");
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
    
    if (forceJson) {
        try {
            const match = resultText.match(/\{[\s\S]*\}/);
            if (match) return JSON.parse(match[0]);
            return JSON.parse(resultText);
        } catch(e) {
            console.error("[tgww] Failed to parse JSON:", resultText);
            return null;
        }
    }
    return resultText;
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
    $('#tgww_loading').text("【警告】信号逆向追踪中...").show();
    
    const sysPrompt = `你正在为一个互动游戏写"逮捕"剧情。
背景: User通过共感娃娃一直触摸${charName}，怀疑度达到100%，${charName}的本体顺着连接抓到了User。
角色性格: ${charPersona}。请深度符合角色性格，绝对不可OOC！
必须包含:
1) ${charName}出场的方式(带有"抓到你了"的压迫感与暧昧，不少于80字)。
2) 对User的"教育"(不少于400字，质问为什么一直碰娃娃，表达真实感受，以及惩罚措施)。
全程第三人称描写Char，第二人称描写User。没有多余的格式，直接输出纯文本故事。`;
    
    const story = await callLLM(sysPrompt, `请生成逮捕剧情文本。`, false) || `*门铃响了。门外传来了${charName}的声音：“找到你了。你以为你对那个娃娃做的事，我感觉不到吗？”* \n\n他猛地推开门，将你逼入角落，眼神中带着危险的笑意，开始了漫长的“教育”...`;
    
    gameState.arrested = true;
    gameState.active = false;
    $('#tgww_main').removeClass('active');
    $('#tgww_arrest').addClass('active');
    $('#tgww_arrest_text').text(story);
    
    // Unlock Easter Egg
    const eggBtn = $('#tgww_btn_easter_egg');
    eggBtn.show();
    eggBtn.off('click').on('click', async function() {
        $(this).hide();
        $('#tgww_loading').text("提取余温记忆...").show();
        
        const eggPrompt = `生成"娃娃的余温"彩蛋剧情(不少于150字)。
背景: 逮捕剧情结束后，${charName}私底下偷偷检查娃娃，并自言自语说了一句关于User的话。符合性格: ${charPersona}`;
        const eggStory = await callLLM(eggPrompt, "请生成彩蛋剧情。", false) || `*他在你看不见的地方，轻轻拿起那个娃娃，指尖摩挲着你刚刚触碰过的地方，嘴角勾起一抹不易察觉的弧度。* “真是个毫无防备的家伙...”`;
        
        $('#tgww_easter_egg_text').text(eggStory).css('opacity', 1);
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
    if (action === "高能动作") {
        actualAction = highEnergyActions[Math.floor(Math.random() * highEnergyActions.length)];
    }

    $('#tgww_loading').text("分析反馈中...").show();
    
    try {
        const { charName, charPersona, userName } = getCharacterContext();
        
        const sysPrompt = `你正在运行一个叫【共感娃娃】的互动游戏实验。
当前角色(${charName})性格: ${charPersona}。玩家(${userName})。
设定: ${charName}和${userName}是恋人。玩家刚刚对共感娃娃执行了动作:【${actualAction}】。${charName}会真实感受到这个触碰。
你必须返回一个JSON对象，格式如下:
{
  "sus_add": <整数，1到5之间，根据动作亲密程度决定>,
  "reaction": "<至少40字的文本，描述${charName}的身体感受和语言/非语言反馈。必须体现共感特性(点出碰了哪里)，符合心跳变化，禁止重复句式，第三人称描写Char，第二人称描写User。>"
}`;
        
        let response = await callLLM(sysPrompt, `玩家动作：${actualAction}。请生成反馈。`);
        
        if (!response || !response.reaction) {
            response = {
                sus_add: Math.floor(Math.random() * 4) + 1,
                reaction: `*${charName}被你${actualAction}后，身体微微颤抖，发出了细碎的呼吸声。他似乎感觉到了那个部位传来的触感。*`
            };
        }
        
        let oldSus = gameState.sus;
        gameState.sus += response.sus_add;
        if(gameState.sus > 100) gameState.sus = 100;
        
        // HR Calculation
        let minHr = 60, maxHr = 80;
        if (gameState.sus > 40) { minHr = 81; maxHr = 110; }
        if (gameState.sus > 75) { minHr = 111; maxHr = 130; }
        if (gameState.sus >= 100) { minHr = 140; maxHr = 150; }
        gameState.hr = Math.floor(Math.random() * (maxHr - minHr + 1)) + minHr;
        
        updateUI();
        
        let displayAction = action === "高能动作" ? `高能动作 [${actualAction}]` : action;
        $('#tgww_summary').text(response.reaction);
        addLog(displayAction, response.reaction + ` (怀疑度 +${response.sus_add})`);

        if (gameState.sus >= 30 && oldSus < 30) showToast("30: 他似乎感觉到了什么...");
        if (gameState.sus >= 60 && oldSus < 60) showToast("60: 他看向娃娃的方向");
        if (gameState.sus >= 80 && oldSus < 80) showToast("80: 他已经在找你了...");

        if(gameState.sus >= 100) {
            await handleArrest(charName, charPersona, userName);
        }
    } catch(e) {
        console.error("生成反应失败:", e);
        showToast("连接中断，无法获取反馈。");
    } finally {
        $('#tgww_loading').hide();
        gameState.isProcessing = false;
    }
}

async function initTgww() {
    console.log(`🚀 共感娃娃 v1.0.7 启动`);
    const $ = window.jQuery;
    if (!$) {
        console.warn('⚠️ jQuery is not loaded yet, tgww initialization failed.');
        return;
    }
    
    const settingsObj = loadSettings();

    try {
        const settingsHtmlUrl = new URL('./settings.html', BASE_URL).href;
        const settingsHtml = await (await fetch(settingsHtmlUrl)).text();
        $('#extensions_settings').append(settingsHtml);
    } catch (e) {
        console.error('Failed to load settings.html', e);
    }

    const inputs = ['tgww_enabled', 'tgww_api_mode', 'tgww_api_url', 'tgww_api_key', 'tgww_api_model'];
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
                if(val === 'custom') $('#tgww_custom_api_settings').show();
                else $('#tgww_custom_api_settings').hide();
            }
        });
    });

    if(settingsObj.apiMode === 'custom') {
        $('#tgww_custom_api_settings').show();
    }

    try {
        const gameHtmlUrl = new URL('./game.html', BASE_URL).href;
        const gameHtml = await (await fetch(gameHtmlUrl)).text();
        $('body').append(gameHtml);
    } catch (e) {
        console.error('Failed to load game.html', e);
    }

    const wrapper = $('#tgww_wrapper');
    wrapper.on('click', (e) => {
        if(e.target === wrapper[0]) {
            wrapper.hide();
        }
    });

    $('#tgww_btn_enter').on('click', () => {
        $('#tgww_cover').css('opacity', 0);
        setTimeout(() => {
            $('#tgww_cover').hide();
            $('#tgww_main').addClass('active');
            gameState.active = true;
        }, 500);
    });

    $('.tgww-action-btn').on('click', function() {
        if (!gameState.active || gameState.arrested) return;
        const action = $(this).data('action');
        generateReaction(action);
    });

    $('#tgww_btn_easter_egg').on('click', function() {
        $(this).hide();
        $('#tgww_easter_egg_text').css('opacity', 1);
    });

    $('#tgww_btn_reset').on('click', () => {
        gameState = { hr: 70, sus: 0, active: true, arrested: false };
        $('#tgww_arrest').removeClass('active');
        $('#tgww_main').addClass('active');
        $('#tgww_logs').empty().append('<div class="tgww-log-entry" style="color: #666;">记忆已重置...重新开始记录。</div>');
        $('#tgww_summary').text('等待连接...');
        $('#tgww_easter_egg_text').css('opacity', 0);
        $('#tgww_btn_easter_egg').hide();
        updateUI();
    });

    const openGameUI = () => {
        if (wrapper && wrapper.length) {
            wrapper.css({
                display: 'flex',
                position: 'fixed',
                top: 0, left: 0, right: 0, bottom: 0,
                background: 'rgba(0,0,0,0.8)',
                zIndex: 2147483647,
                justifyContent: 'center',
                alignItems: 'center'
            });
        }
    };

    if (!document.getElementById('tgww_open_btn')) {
        const triggerBtn = document.createElement('div');
        triggerBtn.id = 'tgww_open_btn';
        triggerBtn.title = '共感娃娃番外';
        triggerBtn.innerHTML = '<i class="fa-solid fa-heart"></i>';
        triggerBtn.style.cssText = 'position:fixed; bottom:120px; right:30px; z-index:2147483647; background:rgba(255,0,50,0.9); color:white; width:50px; height:50px; border-radius:50%; display:flex; justify-content:center; align-items:center; cursor:pointer; box-shadow:0 0 15px rgba(255,0,50,0.8); font-size:24px; transition:all 0.3s;';
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
        chatInputBtn.innerHTML = '<i class="fa-solid fa-heart"></i>';
        chatInputBtn.style.cssText = 'cursor:pointer; margin-left: 5px; color:#ff3333; font-size: 1.2em; display:flex; align-items:center; padding: 5px;';
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
        topMenuBtn.innerHTML = '<i class="fa-solid fa-heart" style="color:#ff3333;"></i> <span>共感娃娃</span>';
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

