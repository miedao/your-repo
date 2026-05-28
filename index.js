import { extension_settings } from '../../../extensions.js';
import { registerSlashCommand } from '../../../slash-commands.js';

const EXTENSION_NAME = 'tgww';
// 使用 import.meta.url 动态获取当前路径，避免因安装目录不同导致 404
const extensionBaseUrl = new URL('./', import.meta.url).href;

const defaultSettings = {
    enabled: true,
    apiMode: 'internal', // internal or custom
    apiUrl: '',
    apiKey: '',
    apiModel: ''
};

// --- Preset Fallbacks (At least 3 per action, 9 actions) ---
const PRESETS = {
    "摸摸头": [
        { action: "你轻轻摸了摸娃娃的头顶", reaction: "他微微一怔，感觉头顶传来一阵温热的触感，像被谁安抚着，眼神不自觉柔和下来。", hr_offset: 2, sus_delta: 1 },
        { action: "你用力揉乱了娃娃的头发", reaction: "他突然觉得头皮微微发麻，忍不住伸手抓了抓自己并没有乱的头发，皱眉低语：“谁在捣乱……”", hr_offset: 5, sus_delta: 2 },
        { action: "你指尖顺着娃娃的发丝滑下", reaction: "他呼吸微顿，头顶传来的细微摩挲感让他有些发痒，他下意识看向四周。", hr_offset: 3, sus_delta: 1 }
    ],
    "捏捏耳朵": [
        { action: "你轻轻捏了捏娃娃的左耳垂", reaction: "他的左耳猛地一热，整个人僵了一下，耳根迅速漫上一抹红晕。", hr_offset: 8, sus_delta: 3 },
        { action: "你对着娃娃的耳朵吹了一口气", reaction: "他倒吸一口冷气，半边身子瞬间酥麻，仿佛有温热的呼吸拂过耳畔，不由得咬紧了后槽牙。", hr_offset: 12, sus_delta: 4 },
        { action: "你揉搓着娃娃毛茸茸的耳朵边缘", reaction: "他闷哼了一声，伸手捂住自己的耳朵，这种直接反馈在神经上的触感让他感到一阵莫名的羞耻。", hr_offset: 7, sus_delta: 2 }
    ],
    "亲亲脸": [
        { action: "你凑过去，在娃娃脸颊上落下一吻", reaction: "他感觉到脸颊上一点温软的湿意，瞳孔微微放大，心脏漏跳了一拍。", hr_offset: 10, sus_delta: 3 },
        { action: "你亲了亲娃娃的额头", reaction: "额头传来的轻柔触感让他下意识闭了闭眼，心底泛起一阵他自己都未察觉的悸动。", hr_offset: 6, sus_delta: 2 },
        { action: "你指尖划过娃娃的脸颊，最后在嘴角亲了一下", reaction: "他呼吸骤然加重，嘴角的触碰如同带着微小的电流，让他不自觉地舔了舔嘴唇。", hr_offset: 12, sus_delta: 4 }
    ],
    "戳戳腰": [
        { action: "你伸出手指，戳了戳娃娃的腰侧", reaction: "他猛地瑟缩了一下，腰部是最敏感的地方，突如其来的触感让他差点跳起来。", hr_offset: 15, sus_delta: 4 },
        { action: "你轻轻揉捏着娃娃的腰部", reaction: "他呼吸一紧，腰上传来的软绵绵的揉捏感让他双腿微软，眼神开始变得危险起来。", hr_offset: 10, sus_delta: 3 },
        { action: "你双手掐住娃娃的腰", reaction: "他感到腰部被一股无形的力量紧紧钳住，这种仿佛被人完全掌控的感觉让他喉结滚动了一下。", hr_offset: 14, sus_delta: 5 }
    ],
    "拍拍背": [
        { action: "你轻轻拍了拍娃娃的后背", reaction: "背部传来的轻拍节奏分明，他原本紧绷的肩膀慢慢放松下来，感觉十分受用。", hr_offset: -2, sus_delta: 1 },
        { action: "你顺着娃娃的脊椎一直捋下去", reaction: "脊背猛地窜上一股战栗，他感觉尾椎骨都在发麻，不自觉地挺直了背脊。", hr_offset: 8, sus_delta: 3 },
        { action: "你用力在娃娃背后拍了一巴掌", reaction: "他突然闷哼一声，后背虽然不疼，但那股清晰的震荡感让他眼神暗了下来：“谁这么大胆？”", hr_offset: 10, sus_delta: 4 }
    ],
    "捏捏手": [
        { action: "你握住娃娃的手，十指相扣", reaction: "他的手指突然不自觉地蜷缩了一下，掌心感受到了另一只手的温度，交叠的错觉无比真实。", hr_offset: 7, sus_delta: 2 },
        { action: "你轻轻揉捏娃娃的手背", reaction: "手背上传来细密的按压感，他看着自己空无一物的手，目光中满是惊疑不定。", hr_offset: 5, sus_delta: 2 },
        { action: "你把玩着娃娃的指尖", reaction: "指尖传来微弱的酥痒，他微微握拳，试图抓住那无形的触碰，嘴角却勾起一抹弧度。", hr_offset: 6, sus_delta: 1 }
    ],
    "拉衣角": [
        { action: "你轻轻拽了拽娃娃的衣角", reaction: "他感觉自己的衣摆被一股微弱的力量向下拉扯，下意识低头看去，却什么也没发现。", hr_offset: 3, sus_delta: 2 },
        { action: "你将手指从娃娃的衣摆探入", reaction: "他猛地倒抽一口气，腹部皮肤上清晰地感受到了指尖滑过的微凉触感，瞬间浑身紧绷。", hr_offset: 15, sus_delta: 5 },
        { action: "你帮娃娃整理了一下领口", reaction: "脖颈处传来细微的摩擦，仿佛有人正在贴近他，他甚至能闻到空气中若有若无的熟悉气息。", hr_offset: 8, sus_delta: 3 }
    ],
    "拥抱娃娃": [
        { action: "你将娃娃整个抱进怀里", reaction: "他感到胸口一阵闷热，仿佛被一个温暖的躯体紧紧包裹，强烈的心跳在胸腔中共鸣。", hr_offset: 12, sus_delta: 4 },
        { action: "你从背后环抱住娃娃", reaction: "背部传来清晰的贴合感，那股熟悉的依赖感让他闭上眼睛，享受了片刻这虚空中的拥抱。", hr_offset: 9, sus_delta: 2 },
        { action: "你把脸埋在娃娃的颈窝里深吸了一口气", reaction: "他颈侧传来温热的吐息，整个人仿佛被点燃了一样，喉咙里溢出一声低哑的叹息。", hr_offset: 18, sus_delta: 5 }
    ],
    "自定义": [
        { action: "你用指尖在娃娃的锁骨上画圈", reaction: "锁骨处传来细微的酥麻感，他呼吸变得急促，眼神幽暗地看向虚空：“你最好别被我抓到。”", hr_offset: 14, sus_delta: 5 },
        { action: "你轻轻咬了娃娃的指尖一口", reaction: "指尖传来一阵微痛伴随着湿润感，他猛地收回手，心跳如擂鼓般剧烈跳动起来。", hr_offset: 16, sus_delta: 5 },
        { action: "你贴着娃娃的脖颈蹭了蹭", reaction: "颈动脉处传来柔软的摩擦，他感觉自己的弱点被完全暴露并把玩，心底升起一股想要反客为主的冲动。", hr_offset: 15, sus_delta: 4 }
    ]
};

// --- State ---
let gameState = {
    hr: 70,
    sus: 0,
    active: false,
    arrested: false
};

function loadSettings() {
    extension_settings[EXTENSION_NAME] = extension_settings[EXTENSION_NAME] || {};
    Object.assign(extension_settings[EXTENSION_NAME], {
        ...defaultSettings,
        ...extension_settings[EXTENSION_NAME],
    });
}

function saveSettings() {
    // Luker convention is to call saveSettingsDebounced
    if (typeof window.saveSettingsDebounced === 'function') {
        window.saveSettingsDebounced();
    }
}

// Update UI elements based on state
function updateUI() {
    $('#tgww_hr_val').text(gameState.hr);
    $('#tgww_suspicion_val').text(gameState.sus);
    $('#tgww_suspicion_bar').css('width', `${Math.min(100, gameState.sus)}%`);
    
    // Color scale for suspicion
    if (gameState.sus < 30) $('#tgww_suspicion_bar').css('background', '#4caf50');
    else if (gameState.sus < 70) $('#tgww_suspicion_bar').css('background', '#ffeb3b');
    else $('#tgww_suspicion_bar').css('background', '#f44336');

    // Warning toasts
    if (gameState.sus === 30) showToast("30%: 他似乎感觉到了什么...");
    if (gameState.sus === 60) showToast("60%: 他正在寻找触感的来源...");
    if (gameState.sus === 80) showToast("80%: 警告！他已经在找你了！");
}

function showToast(msg) {
    const toast = $('#tgww_toast');
    toast.text(msg).css('opacity', 1);
    setTimeout(() => toast.css('opacity', 0), 3000);
}

function appendLog(actionStr, reactionStr) {
    const logArea = $('#tgww_logs');
    const entry = $(`<div class="tgww-log-entry">
        <span class="tgww-log-action">【USER】${actionStr}</span><br/>
        <span class="tgww-log-reaction">【CHAR】${reactionStr}</span>
    </div>`);
    logArea.prepend(entry);
    $('#tgww_summary').text(reactionStr.substring(0, 30) + '...');
}

// Generate Response via API
async function generateReaction(actionName) {
    const settings = extension_settings[EXTENSION_NAME];
    
    // 1. Fallback mechanism or mock when API fails/is internal (for simplicity if generateQuietPrompt is unavailable)
    const presetList = PRESETS[actionName] || PRESETS['自定义'];
    const preset = presetList[Math.floor(Math.random() * presetList.length)];
    
    let actionDesc = preset.action;
    let charReaction = preset.reaction;
    let hrOffset = preset.hr_offset;
    let susDelta = preset.sus_delta;

    // Optional: Call LLM API
    if (settings.apiMode === 'custom' && settings.apiUrl && settings.apiKey) {
        try {
            $('#tgww_loading').show();
            const prompt = `你正在运行一个"共感娃娃"互动游戏。设定：User正在触碰一个与Char感官相连的娃娃。Char会实时感受到触碰。当前怀疑度为${gameState.sus}/100。
User点击了：【${actionName}】。
请生成以下内容的JSON格式响应（不要输出任何其他内容）：
{
  "action": "User具体的动作描述（一句话，如：你轻轻摸了摸娃娃的头）",
  "reaction": "Char感受到的身体反馈及反应（不少于40字，第三人称描述Char）",
  "hr_offset": 心率变化数值（-5到20的整数，当前紧张度决定）,
  "sus_delta": 怀疑度增加值（1到5的整数）
}`;
            
            const response = await fetch(settings.apiUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${settings.apiKey}`
                },
                body: JSON.stringify({
                    model: settings.apiModel || 'gpt-3.5-turbo',
                    messages: [{role: "system", content: "你是一个纯JSON输出机器。"}, {role: "user", content: prompt}],
                    temperature: 0.7
                })
            });

            const data = await response.json();
            const content = data.choices[0].message.content;
            const parsed = JSON.parse(content.replace(/```json/g, '').replace(/```/g, ''));
            
            if (parsed.action) actionDesc = parsed.action;
            if (parsed.reaction) charReaction = parsed.reaction;
            if (parsed.hr_offset !== undefined) hrOffset = parsed.hr_offset;
            if (parsed.sus_delta !== undefined) susDelta = parsed.sus_delta;

        } catch (e) {
            console.error("[tgww] API调用失败，使用预设回退:", e);
        } finally {
            $('#tgww_loading').hide();
        }
    } else if (settings.apiMode === 'internal') {
        const context = window.Luker ? window.Luker.getContext() : (window.SillyTavern ? window.SillyTavern.getContext() : null);
        if (context && context.generateQuietPrompt) {
            // Internal Luker API Generation could be invoked here if supported without modifying core chat
            // For safety and immediate response in this mock game without polluting chat context, we randomly pick from presets
            // But we simulate a delay.
            $('#tgww_loading').show();
            await new Promise(r => setTimeout(r, 800));
            $('#tgww_loading').hide();
        } else {
            $('#tgww_loading').show();
            await new Promise(r => setTimeout(r, 800));
            $('#tgww_loading').hide();
        }
    }

    // Apply state
    gameState.sus += susDelta;
    gameState.hr = Math.max(60, Math.min(150, gameState.hr + hrOffset));
    if (gameState.hr < 70 && gameState.sus > 50) gameState.hr += 10; // Base HR rises with suspicion
    
    appendLog(actionDesc, charReaction);
    
    if (gameState.sus >= 100) {
        gameState.sus = 100;
        updateUI();
        triggerArrest();
    } else {
        updateUI();
    }
}

async function triggerArrest() {
    if (gameState.arrested) return;
    gameState.arrested = true;
    
    $('#tgww_main').removeClass('active');
    $('#tgww_arrest').addClass('active');
    $('#tgww_loading').show();

    // Default Arrest Content
    let arrestTitle = "抓到你了。";
    let arrestText = "房间的灯光忽然闪烁了一下，身后传来一声轻笑。一只微凉的手搭上了你的肩膀，带来不容反抗的压迫感。<br/><br/>“你以为我不知道你在做什么吗？”他的声音贴着你的耳郭响起，带着一丝危险的笑意，“每次我毫无防备地感到战栗，你都在看着这具人偶，对吧？”<br/>他从你手中抽走那个共感娃娃，随意地扔在桌上。随后，他转身将你抵在实验台上，目光紧紧锁住你。<br/>“既然你这么喜欢玩这种共感游戏……那我们现在就来试试，直接触碰的效果会不会更好？”";
    let easterEgg = "你被带走后，实验室归于寂静。桌上的娃娃静静地躺着。半小时后，他一个人推门进来，拿起娃娃，指腹轻轻摩挲着你刚才碰过的地方，嘴角勾起一抹满意的笑：“……胆子还挺大。”";

    const settings = extension_settings[EXTENSION_NAME];
    if (settings.apiMode === 'custom' && settings.apiUrl && settings.apiKey) {
        try {
            const prompt = `共感娃娃实验中，怀疑度达到了100。请生成逮捕剧情：
{
  "title": "简短的一句话，如：抓到你了",
  "text": "Char突然出现抓住User的详细过程和说教/惩罚内容（不少于400字，带有压迫感与暧昧）",
  "easter_egg": "事后Char独自面对娃娃时的自言自语（不少于150字）"
}`;
            const response = await fetch(settings.apiUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${settings.apiKey}`
                },
                body: JSON.stringify({
                    model: settings.apiModel || 'gpt-3.5-turbo',
                    messages: [{role: "system", content: "你是一个纯JSON输出机器。"}, {role: "user", content: prompt}],
                    temperature: 0.8
                })
            });
            const data = await response.json();
            const parsed = JSON.parse(data.choices[0].message.content.replace(/```json/g, '').replace(/```/g, ''));
            if(parsed.text) arrestText = parsed.text;
            if(parsed.title) arrestTitle = parsed.title;
            if(parsed.easter_egg) easterEgg = parsed.easter_egg;
        } catch(e) {
            console.error("Arrest API fail", e);
        }
    } else {
        await new Promise(r => setTimeout(r, 1000));
    }

    $('#tgww_loading').hide();
    
    gameState.hr = 150;
    $('#tgww_arrest h2').text(arrestTitle);
    $('#tgww_arrest_text').html(arrestText.replace(/\n/g, '<br/>'));
    $('#tgww_easter_egg_text').html(easterEgg.replace(/\n/g, '<br/>'));
    
    // Show Easter Egg btn after a few seconds
    setTimeout(() => {
        $('#tgww_btn_easter_egg').show();
    }, 2000);
}

// Setup Settings UI
async function setupSettings() {
    try {
        const settingsHtmlUrl = new URL('./settings.html', import.meta.url).href;
        const settingsHtml = await $.get(settingsHtmlUrl);
        $('#extensions_settings').append(settingsHtml);

        const inputs = ['tgww_enabled', 'tgww_api_mode', 'tgww_api_url', 'tgww_api_key', 'tgww_api_model'];
        
        inputs.forEach(id => {
            const el = $(`#${id}`);
            if(el.is(':checkbox')) el.prop('checked', extension_settings[EXTENSION_NAME][id.replace('tgww_', '')]);
            else el.val(extension_settings[EXTENSION_NAME][id.replace('tgww_', '')] || '');
            
            el.on('change', function() {
                let val = $(this).is(':checkbox') ? $(this).prop('checked') : $(this).val();
                extension_settings[EXTENSION_NAME][id.replace('tgww_', '')] = val;
                saveSettings();
                
                if(id === 'tgww_api_mode') {
                    if(val === 'custom') $('#tgww_custom_api_settings').show();
                    else $('#tgww_custom_api_settings').hide();
                }
                if(id === 'tgww_enabled') {
                    $('#tgww_open_btn').toggle(val);
                    $('#tgww_top_btn').toggle(val);
                }
            });
        });

        if(extension_settings[EXTENSION_NAME].apiMode === 'custom') {
            $('#tgww_custom_api_settings').show();
        }
    } catch(e) {
        console.error("[tgww] 渲染设置面板失败:", e);
    }
}

// Inject Game Button and Slash Command
async function setupGameUI() {
    try {
        console.log("[tgww] 正在初始化共感娃娃 UI...");

        // 1. 添加全局悬浮按钮
        const triggerBtn = $('<div id="tgww_open_btn" title="共感娃娃番外" style="position:fixed; bottom:80px; right:20px; z-index:9990; background:rgba(255,0,50,0.8); color:white; width:45px; height:45px; border-radius:50%; display:flex; justify-content:center; align-items:center; cursor:pointer; box-shadow:0 0 10px rgba(255,0,50,0.5); font-size:20px; transition:all 0.3s;"><i class="fa-solid fa-heart"></i></div>');
        
        // 2. 添加到顶部扩展菜单 (更符合 ST/Luker 原生习惯)
        const topMenuBtn = $('<div id="tgww_top_btn" class="menu_button" title="共感娃娃番外" style="cursor:pointer;"><i class="fa-solid fa-heart" style="color:#ff3333;"></i> <span>共感娃娃</span></div>');
        
        if(!extension_settings[EXTENSION_NAME].enabled) {
            triggerBtn.hide();
            topMenuBtn.hide();
        }
        
        $('body').append(triggerBtn);
        
        // 尝试添加到顶部菜单栏的扩展容器中
        const topMenu = $('#extensionsMenu, #top-bar, .top-bar-extensions');
        if (topMenu.length) {
            topMenu.first().append(topMenuBtn);
        } else {
            // 兜底：加到页面左上角
            topMenuBtn.css({position: 'fixed', top: '10px', left: '10px', zIndex: 9990, background: 'rgba(0,0,0,0.5)', padding: '5px 10px', borderRadius: '5px', color: 'white'});
            $('body').append(topMenuBtn);
        }

        // Load Game HTML using robust URL
        const gameHtmlUrl = new URL('./game.html', import.meta.url).href;
        const gameHtmlStr = await $.get(gameHtmlUrl);
        $('body').append(gameHtmlStr);

        const wrapper = $('#tgww_wrapper');
        
        const openGameUI = () => {
            wrapper.css({
                'display': 'flex',
                'position': 'fixed',
                'top': '0', 'left': '0', 'right': '0', 'bottom': '0',
                'background': 'rgba(0,0,0,0.8)',
                'z-index': '9999',
                'justify-content': 'center',
                'align-items': 'center'
            });
        };

        triggerBtn.on('click', openGameUI);
        topMenuBtn.on('click', openGameUI);
        
        // Hover effects
        triggerBtn.hover(
            function() { $(this).css('transform', 'scale(1.1)'); },
            function() { $(this).css('transform', 'scale(1)'); }
        );

        // Register slash command as an alternative trigger
        try {
            registerSlashCommand('tgww', async () => {
                openGameUI();
                return '';
            }, [], '打开共感娃娃番外互动界面');
        } catch (e) {
            console.warn("[tgww] 注册斜杠命令失败，可能当前版本不支持:", e);
        }

        // Close on click outside
        wrapper.on('click', (e) => {
            if(e.target === wrapper[0]) {
                wrapper.hide();
            }
        });

        // Event Bindings for Game
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
        
        console.log("[tgww] UI 注入完成!");
    } catch (e) {
        console.error("[tgww] 初始化 UI 遇到错误:", e);
    }
}

// Init
console.log("[tgww] 插件开始加载...");
if (!window.TGWW_Loaded) {
    window.TGWW_Loaded = true;
    jQuery(async () => {
        try {
            loadSettings();
            await setupSettings();
            await setupGameUI();
            console.log("[tgww] 插件加载成功!");
        } catch (e) {
            console.error("[tgww] 插件加载失败:", e);
        }
    });
} else {
    console.warn("[tgww] 插件已加载，跳过重复初始化。");
}
