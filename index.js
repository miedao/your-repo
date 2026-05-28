import { extension_settings, getContext } from '../../../extensions.js';
import { eventSource, event_types } from '../../../../script.js';
import { registerSlashCommand } from '../../../slash-commands.js';

const EXTENSION_NAME = 'tgww';
const extensionFolderPath = `third-party/${EXTENSION_NAME}`;

let gameState = { hr: 72, sus: 0, active: false, arrested: false };

const defaultSettings = {
    enabled: true,
    apiMode: 'internal',
    apiUrl: '',
    apiKey: '',
    apiModel: ''
};

function loadSettings() {
    extension_settings[EXTENSION_NAME] = extension_settings[EXTENSION_NAME] || {};
    Object.assign(extension_settings[EXTENSION_NAME], {
        ...defaultSettings,
        ...extension_settings[EXTENSION_NAME],
    });
}

function saveSettings() {
    const context = getContext();
    if (context.saveSettingsDebounced) {
        context.saveSettingsDebounced();
    } else if (typeof window.saveSettingsDebounced === 'function') {
        window.saveSettingsDebounced();
    }
}

function updateUI() {
    const $ = window.jQuery;
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

function addLog(action, result) {
    const $ = window.jQuery;
    const logs = $('#tgww_logs');
    const entry = $(`<div class="tgww-log-entry">
        <strong>动作:</strong> ${action}<br/>
        <span style="color:#00f2fe">=> ${result}</span>
    </div>`);
    logs.prepend(entry);
}

function showToast(msg) {
    const $ = window.jQuery;
    const t = $('#tgww_toast');
    t.text(msg).addClass('show');
    setTimeout(() => t.removeClass('show'), 3000);
}

function triggerArrest(reason, egg) {
    gameState.arrested = true;
    gameState.active = false;
    const $ = window.jQuery;
    $('#tgww_main').removeClass('active');
    $('#tgww_arrest').addClass('active');
    $('#tgww_arrest_text').text(reason);
    if(egg) {
        $('#tgww_btn_easter_egg').show();
        $('#tgww_easter_egg_text').text(egg);
    }
}

async function generateReaction(action) {
    const $ = window.jQuery;
    $('#tgww_loading').show();
    
    try {
        const context = getContext();
        let charName = '他';
        if (context.characters && context.characterId !== undefined && context.characters[context.characterId]) {
            charName = context.characters[context.characterId].name || '他';
        }
        
        // Mock response for now
        let newHr = gameState.hr + Math.floor(Math.random() * 15);
        let newSus = gameState.sus + Math.floor(Math.random() * 20);
        if(newHr > 180) newHr = 180;
        if(newSus > 100) newSus = 100;
        
        gameState.hr = newHr;
        gameState.sus = newSus;
        
        let reactionStr = `*${charName}被你${action}后，身体微微颤抖，发出了细碎的呼吸声。*`;
        
        updateUI();
        $('#tgww_summary').text(reactionStr);
        addLog(action, reactionStr);

        if(gameState.sus >= 100) {
            setTimeout(() => {
                triggerArrest(
                    `【逮捕报告】因多次执行高风险动作[${action}]，${charName}的本体已经顺着连接定位到了你的坐标。`,
                    `*门铃响了。门外传来了${charName}的声音：“找到你了。”*`
                );
            }, 1500);
        }
    } catch(e) {
        console.error("生成反应失败:", e);
        showToast("连接中断，无法获取反馈。");
    } finally {
        $('#tgww_loading').hide();
    }
}

jQuery(async () => {
    console.log(`🚀 共感娃娃 v1.0.6 启动`);
    loadSettings();

    // 加载设置面板 HTML
    const settingsHtml = await $.get(`${extensionFolderPath}/settings.html`);
    $('#extensions_settings').append(settingsHtml);

    const settingsObj = extension_settings[EXTENSION_NAME];
    const inputs = ['tgww_enabled', 'tgww_api_mode', 'tgww_api_url', 'tgww_api_key', 'tgww_api_model'];
    
    inputs.forEach(id => {
        const el = $(`#${id}`);
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

    // 加载游戏界面 HTML
    const gameHtml = await $.get(`${extensionFolderPath}/game.html`);
    $('body').append(gameHtml);

    // 绑定游戏 UI
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

    // 创建触发按钮
    const openGameUI = () => {
        if (wrapper) {
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

    // 全局悬浮按钮
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

    // 聊天框旁边按钮
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
        
    // 顶部菜单注入
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

    // 注册斜杠命令
    try {
        registerSlashCommand('tgww', async () => {
            openGameUI();
            return '';
        }, [], '打开共感娃娃番外互动界面');
    } catch (e) {
        console.warn("[tgww] 注册斜杠命令失败:", e);
    }
});
