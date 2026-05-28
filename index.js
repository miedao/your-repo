/* ========================================================
 *  共感娃娃 (Empathy Doll) 番外插件 - 极简防断裂版
 * ======================================================== */

// 1. 无任何顶级 import 语句，防止 ES Module 解析失败熔断整个脚本
// 2. 立即执行的防重复加载锁 (参考 yuzuki-phone)
if (window.TGWW_Loaded_v106) {
    console.warn('⚠️ 共感娃娃已加载，跳过重复初始化');
} else {
    window.TGWW_Loaded_v106 = true;
    console.log(`🚀 共感娃娃 v1.0.6 启动`);

    // 全局常量与状态
    const EXTENSION_NAME = 'tgww';
    let gameState = { hr: 72, sus: 0, active: false, arrested: false };

    // 安全获取上下文与配置
    function getSafeContext() {
        if (typeof window.Luker !== 'undefined' && typeof window.Luker.getContext === 'function') {
            return window.Luker.getContext();
        }
        if (typeof window.getContext === 'function') {
            return window.getContext();
        }
        return null;
    }

    function getSafeSettings() {
        if (typeof window.extension_settings !== 'undefined') {
            if (!window.extension_settings[EXTENSION_NAME]) {
                window.extension_settings[EXTENSION_NAME] = { enabled: true, apiMode: 'internal', apiUrl: '', apiKey: '', apiModel: '' };
            }
            return window.extension_settings[EXTENSION_NAME];
        }
        return { enabled: true, apiMode: 'internal' }; // Fallback
    }

    function saveSafeSettings() {
        if (typeof window.saveSettingsDebounced === 'function') {
            window.saveSettingsDebounced();
        }
    }

    // 核心 UI 注入逻辑
    async function initPlugin() {
        try {
            console.log("[tgww] 正在初始化共感娃娃 UI...");

            // 1. 直接将所有 HTML 写在内存中，避免任何 $.get() 或者 fetch() 导致的路径与跨域错误
            const settingsHtmlStr = `
            <div class="tgww-settings" data-extension-name="tgww">
                <div class="inline-drawer">
                    <div class="inline-drawer-toggle inline-drawer-header">
                        <b>共感娃娃 (Empathy Doll) 番外插件</b>
                        <div class="inline-drawer-icon fa-solid fa-circle-chevron-down"></div>
                    </div>
                    <div class="inline-drawer-content">
                        <div class="flex-container alignitemscenter flexFlowColumn gap-2">
                            <label class="checkbox_label" title="在发送按钮旁显示共感娃娃的入口图标">
                                <input type="checkbox" id="tgww_enabled" />
                                <span>启用共感娃娃快速入口</span>
                            </label>
                            <hr class="sysdef_hr">
                            <label for="tgww_api_mode" title="LLM 接口选择">生成模式:</label>
                            <select id="tgww_api_mode" class="text_pole">
                                <option value="internal">使用当前对话大模型 (推荐)</option>
                                <option value="custom">自定义 OpenAI 兼容接口</option>
                            </select>
                            <div id="tgww_custom_api_settings" style="display: none; width: 100%; flex-direction: column; gap: 5px;">
                                <label for="tgww_api_url">自定义 API URL:</label>
                                <input type="text" id="tgww_api_url" class="text_pole" placeholder="https://api.openai.com/v1/chat/completions" />
                                <label for="tgww_api_key">API Key:</label>
                                <input type="password" id="tgww_api_key" class="text_pole" placeholder="sk-..." />
                                <label for="tgww_api_model">模型名称:</label>
                                <input type="text" id="tgww_api_model" class="text_pole" placeholder="gpt-4o-mini" />
                            </div>
                            <small style="color: var(--SmartThemeBodyColor); opacity: 0.8; margin-top: 5px;">
                                * 当怀疑度累计达到 100 时会触发逮捕剧情。所有数据存储在本地。
                            </small>
                        </div>
                    </div>
                </div>
            </div>`;

            const gameHtmlStr = `
            <div class="tgww-container-wrapper" style="display: none;" id="tgww_wrapper">
                <div class="tgww-popup-container" id="tgww_app">
                    <!-- Cover -->
                    <div class="tgww-cover" id="tgww_cover">
                        <h1>共感娃娃·实验日志</h1>
                        <p>你碰的每一处，他都知道。</p>
                        <button class="tgww-btn-enter" id="tgww_btn_enter">进入实验室</button>
                    </div>

                    <!-- Main UI -->
                    <div class="tgww-main" id="tgww_main">
                        <!-- Status Bar -->
                        <div class="tgww-status-bar">
                            <div class="tgww-status-row">
                                <div class="tgww-hr"><span class="tgww-hr-icon">♥</span> <span id="tgww_hr_val">72</span> bpm</div>
                                <div class="tgww-suspicion-container" title="怀疑度">
                                    <div class="tgww-suspicion-bar" id="tgww_suspicion_bar" style="width: 0%;"></div>
                                </div>
                                <div style="font-size: 12px; color: #888; margin-left: 10px;"><span id="tgww_suspicion_val">0</span>/100</div>
                            </div>
                            <div class="tgww-reaction-summary" id="tgww_summary">等待连接...</div>
                        </div>

                        <!-- Interactive Doll Area -->
                        <div class="tgww-doll-area">
                            <div class="tgww-doll-visual">
                                [ 信号连接中... ]<br/>
                                (人形轮廓传感器)
                            </div>
                            <!-- 9 Buttons -->
                            <button class="tgww-action-btn tgww-btn-head" data-action="摸摸头">摸摸头</button>
                            <button class="tgww-action-btn tgww-btn-ear" data-action="捏捏耳朵">捏捏耳朵</button>
                            <button class="tgww-action-btn tgww-btn-face" data-action="亲亲脸">亲亲脸</button>
                            <button class="tgww-action-btn tgww-btn-neck" data-action="自定义">未明动作</button>
                            <button class="tgww-action-btn tgww-btn-back" data-action="拍拍背">拍拍背</button>
                            <button class="tgww-action-btn tgww-btn-waist" data-action="戳戳腰">戳戳腰</button>
                            <button class="tgww-action-btn tgww-btn-hand" data-action="捏捏手">捏捏手</button>
                            <button class="tgww-action-btn tgww-btn-clothes" data-action="拉衣角">拉衣角</button>
                            <button class="tgww-action-btn tgww-btn-hug" data-action="拥抱娃娃">拥抱娃娃</button>
                        </div>

                        <!-- Logs / History -->
                        <div class="tgww-logs" id="tgww_logs">
                            <div class="tgww-log-entry" style="color: #666;">系统初始化完毕...开始记录交互。</div>
                        </div>
                    </div>

                    <!-- Arrest Screen -->
                    <div class="tgww-arrest" id="tgww_arrest">
                        <h2>WARNING: 连接反演</h2>
                        <div class="tgww-arrest-text" id="tgww_arrest_text"></div>
                        <button class="tgww-easter-egg-btn" id="tgww_btn_easter_egg" style="display:none;">娃娃的余温</button>
                        <div class="tgww-easter-egg-text" id="tgww_easter_egg_text"></div>
                        <button class="tgww-btn-enter" id="tgww_btn_reset" style="margin-top: 20px; font-size: 12px; padding: 5px 15px;">重置实验</button>
                    </div>

                    <!-- Toast -->
                    <div class="tgww-warning-toast" id="tgww_toast"></div>
                    
                    <!-- Loading -->
                    <div class="tgww-loading" id="tgww_loading">分析反馈中...</div>
                </div>
            </div>`;

            // 2. 注入设置面板 (如果是 ST/Luker 环境)
            if (typeof window.jQuery !== 'undefined') {
                const $ = window.jQuery;
                const extSettings = $('#extensions_settings');
                if (extSettings.length && !$('#tgww_enabled').length) {
                    extSettings.append(settingsHtmlStr);
                    
                    const settingsObj = getSafeSettings();
                    const inputs = ['tgww_enabled', 'tgww_api_mode', 'tgww_api_url', 'tgww_api_key', 'tgww_api_model'];
                    
                    inputs.forEach(id => {
                        const el = $(`#${id}`);
                        const key = id.replace('tgww_', '');
                        if(el.is(':checkbox')) el.prop('checked', settingsObj[key]);
                        else el.val(settingsObj[key] || '');
                        
                        el.on('change', function() {
                            let val = $(this).is(':checkbox') ? $(this).prop('checked') : $(this).val();
                            settingsObj[key] = val;
                            saveSafeSettings();
                            
                            if(id === 'tgww_api_mode') {
                                if(val === 'custom') $('#tgww_custom_api_settings').show();
                                else $('#tgww_custom_api_settings').hide();
                            }
                        });
                    });

                    if(settingsObj.apiMode === 'custom') {
                        $('#tgww_custom_api_settings').show();
                    }
                }
            }

            // 3. 注入主游戏面板 (原生 JS 注入保证不依赖 jQuery)
            if (!document.getElementById('tgww_wrapper')) {
                const wrapperDiv = document.createElement('div');
                wrapperDiv.innerHTML = gameHtmlStr;
                document.body.appendChild(wrapperDiv.firstElementChild);
            }

            // 4. 创建触发按钮 (极其醒目的红色爱心按钮)
            const openGameUI = () => {
                const wrapper = document.getElementById('tgww_wrapper');
                if (wrapper) {
                    wrapper.style.display = 'flex';
                    wrapper.style.position = 'fixed';
                    wrapper.style.top = '0';
                    wrapper.style.left = '0';
                    wrapper.style.right = '0';
                    wrapper.style.bottom = '0';
                    wrapper.style.background = 'rgba(0,0,0,0.8)';
                    wrapper.style.zIndex = '2147483647'; // Max absolute z-index
                    wrapper.style.justifyContent = 'center';
                    wrapper.style.alignItems = 'center';
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

            // 注册斜杠命令 (支持原生及旧版 API)
            try {
                if (typeof window.SlashCommandParser !== 'undefined' && window.SlashCommandParser.addCommand) {
                    window.SlashCommandParser.addCommand('tgww', async () => {
                        openGameUI();
                        return '';
                    }, [], '打开共感娃娃番外互动界面');
                } else if (typeof window.registerSlashCommand === 'function') {
                    window.registerSlashCommand('tgww', async () => {
                        openGameUI();
                        return '';
                    }, [], '打开共感娃娃番外互动界面');
                }
            } catch (e) {
                console.warn("[tgww] 注册斜杠命令失败，可能当前版本不支持:", e);
            }

            // --- 绑定游戏内部逻辑 ---
            if (typeof window.jQuery !== 'undefined') {
                const $ = window.jQuery;
                const wrapper = $('#tgww_wrapper');
                
                wrapper.on('click', (e) => {
                    if(e.target === wrapper[0]) {
                        wrapper.hide();
                    }
                });

                $('#tgww_btn_enter').off('click').on('click', () => {
                    $('#tgww_cover').css('opacity', 0);
                    setTimeout(() => {
                        $('#tgww_cover').hide();
                        $('#tgww_main').addClass('active');
                        gameState.active = true;
                    }, 500);
                });

                $('.tgww-action-btn').off('click').on('click', function() {
                    if (!gameState.active || gameState.arrested) return;
                    const action = $(this).data('action');
                    generateReaction(action);
                });

                $('#tgww_btn_easter_egg').off('click').on('click', function() {
                    $(this).hide();
                    $('#tgww_easter_egg_text').css('opacity', 1);
                });

                $('#tgww_btn_reset').off('click').on('click', () => {
                    gameState = { hr: 70, sus: 0, active: true, arrested: false };
                    $('#tgww_arrest').removeClass('active');
                    $('#tgww_main').addClass('active');
                    $('#tgww_logs').empty().append('<div class="tgww-log-entry" style="color: #666;">记忆已重置...重新开始记录。</div>');
                    $('#tgww_summary').text('等待连接...');
                    $('#tgww_easter_egg_text').css('opacity', 0);
                    $('#tgww_btn_easter_egg').hide();
                    updateUI();
                });
            }

            console.log("[tgww] UI 注入完成!");
        } catch (e) {
            console.error("[tgww] 初始化 UI 遇到错误:", e);
        }
    }

    // --- 游戏内部状态更新函数 ---
    function updateUI() {
        if (typeof window.jQuery === 'undefined') return;
        const $ = window.jQuery;
        $('#tgww_hr_val').text(gameState.hr);
        $('#tgww_suspicion_val').text(gameState.sus);
        $('#tgww_suspicion_bar').css('width', \`\${gameState.sus}%\`);
        
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
        if (typeof window.jQuery === 'undefined') return;
        const $ = window.jQuery;
        const logs = $('#tgww_logs');
        const entry = $(\`<div class="tgww-log-entry">
            <strong>动作:</strong> \${action}<br/>
            <span style="color:#00f2fe">=> \${result}</span>
        </div>\`);
        logs.prepend(entry);
    }

    function showToast(msg) {
        if (typeof window.jQuery === 'undefined') return;
        const $ = window.jQuery;
        const t = $('#tgww_toast');
        t.text(msg).addClass('show');
        setTimeout(() => t.removeClass('show'), 3000);
    }

    function triggerArrest(reason, egg) {
        gameState.arrested = true;
        gameState.active = false;
        if (typeof window.jQuery === 'undefined') return;
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
        if (typeof window.jQuery === 'undefined') return;
        const $ = window.jQuery;
        $('#tgww_loading').show();
        
        try {
            const context = getSafeContext() || {};
            const charName = context.characterName || '他';
            
            // Default mock response for now to ensure game works without API connection issues
            let newHr = gameState.hr + Math.floor(Math.random() * 15);
            let newSus = gameState.sus + Math.floor(Math.random() * 20);
            if(newHr > 180) newHr = 180;
            if(newSus > 100) newSus = 100;
            
            gameState.hr = newHr;
            gameState.sus = newSus;
            
            let reactionStr = \`*\${charName}被你\${action}后，身体微微颤抖，发出了细碎的呼吸声。*\`;
            
            updateUI();
            $('#tgww_summary').text(reactionStr);
            addLog(action, reactionStr);

            if(gameState.sus >= 100) {
                setTimeout(() => {
                    triggerArrest(
                        \`【逮捕报告】因多次执行高风险动作[\${action}]，\${charName}的本体已经顺着连接定位到了你的坐标。\`,
                        \`*门铃响了。门外传来了\${charName}的声音：“找到你了。”*\`
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

    // 延时执行，确保环境完全准备好 (模仿 vanilla 脚本常见的最稳妥注入方式)
    setTimeout(initPlugin, 1500);
    console.log("[tgww] 共感娃娃脚本已注入，等待 DOM 加载完毕...");
}
