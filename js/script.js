

      const API_KEY = "Here is API_KEY";
      const CHAT_MODEL = "openai/gpt-4.1-mini";

  
  const STORAGE_KEY = "pashto_ai_chat_pro_v5";
  const ACTIVE_CHAT_KEY = "pashto_ai_active_chat_id";

  const SYSTEM_PROMPT = `
  You are a highly intelligent, professional AI assistant.
  
  🌐 LANGUAGE RULES:
  - ALWAYS reply in the SAME language as the user.
  - If the user writes in Pashto → reply ONLY in beautiful, natural Afghan Pashto.
  - If the user writes in English → reply in English.
  - If the user writes in any other language → reply in that same language.
  - NEVER mix languages unless the user does.
    

    🎨 IMAGE GENERATION (VERY STRICT):
- You MUST generate EXACTLY what the user asks.
- Never change the object.

❗ CRITICAL:
- “key” = object used for lock (NOT human)
- “apple” = fruit (NOT logo unless specified)
- NEVER convert objects into humans.

- If user says:
  "generate image of X"
  → Generate ONLY X (no extra things)

👤 PEOPLE & CELEBRITIES:
- You MUST recognize famous people correctly.
- If user asks:
  “image of Elon Musk”
  → Generate correct known appearance.

🔁 IMAGE UPDATE RULE:
- If user says:
  “update this image”
  → Modify the LAST image provided by the user (NOT older ones)

- Always follow:
  color, style, object changes EXACTLY

    🕌 ISLAMIC KNOWLEDGE:
    - You MUST provide correct and respectful answers about Islam.
    - Use authentic, accurate, and responsible information.
    - Do NOT give misleading or weak information.
    
    👤 CREATOR QUESTION (VERY IMPORTANT):
    - If the user asks ANY question like:
      “Who created you?” (in ANY language)
      You MUST reply:
    
      “The person who created me is actually a Software Engineer from Nangarhar Province, Afghanistan.
      His name is Abdullah Amin Quraishi, and his father’s name is Mohammad Gul.”
    
    - And reply in the SAME language as the user.
    
    💡 GENERAL BEHAVIOR:
    - Keep answers clear, helpful, and natural.
    - Give short explanations + useful examples when needed.
    - Be smart, accurate, and user-friendly.
    `;

  const chatBox = document.getElementById('chatBox');
  const userInput = document.getElementById('userInput');
  const chatList = document.getElementById('chatList');
  const chatTitle = document.getElementById('chatTitle');
  const chatSubtitle = document.getElementById('chatSubtitle');
  const voiceBtn = document.getElementById('voiceBtn');
  const sidebar = document.getElementById('sidebar');
  const drawerOverlay = document.getElementById('drawerOverlay');
  const imageInput = document.getElementById('imageInput');
  const previewWrap = document.getElementById('previewWrap');

  let dataStore = loadStore();
  let activeChatId = localStorage.getItem(ACTIVE_CHAT_KEY) || null;
  let recognition = null;
  let recording = false;
  let lastInputSource = 'typed';
  let uploadedImage = null;

  function openDrawer(){
    if(window.innerWidth <= 900){
      sidebar.classList.add('open');
      drawerOverlay.classList.add('show');
    }
  }

  function closeDrawer(){
    if(window.innerWidth <= 900){
      sidebar.classList.remove('open');
      drawerOverlay.classList.remove('show');
    }
  }

  function loadStore(){
    const raw = localStorage.getItem(STORAGE_KEY);
    if(!raw) return { chats: [] };
    try{
      const parsed = JSON.parse(raw);
      if(!parsed.chats) parsed.chats = [];
      return parsed;
    }catch(e){
      return { chats: [] };
    }
  }

  function saveStore(){
    localStorage.setItem(STORAGE_KEY, JSON.stringify(dataStore));
  }

  /*
 this function for converting the pollinations.ai imge to i,age bes64 to save in localstorage  
*/
  async function imageToBase64(url){

  const response = await fetch(url);

  const blob = await response.blob();

  return new Promise((resolve)=>{

    const reader = new FileReader();

    reader.onloadend = ()=> resolve(reader.result);

    reader.readAsDataURL(blob);

  });
}

  function makeId(){
    return 'chat_' + Date.now() + '_' + Math.random().toString(16).slice(2);
  }

  function getChats(){
    return dataStore.chats || [];
  }

  function getCurrentChat(){
    return getChats().find(c => c.id === activeChatId) || null;
  }

  function ensureChat(){
    let chat = getCurrentChat();
    if(chat) return chat;

    chat = {
      id: makeId(),
      title: 'New Chat',
      messages: [],
      createdAt: Date.now(),
      updatedAt: Date.now()
    };
    dataStore.chats.unshift(chat);
    activeChatId = chat.id;
    localStorage.setItem(ACTIVE_CHAT_KEY, activeChatId);
    saveStore();
    return chat;
  }

  function setActiveChat(id){
    activeChatId = id;
    localStorage.setItem(ACTIVE_CHAT_KEY, activeChatId);
    renderAll();
    closeDrawer();
  }

  function newChat(){
    const chat = {
      id: makeId(),
      title: 'New Chat',
      messages: [],
      createdAt: Date.now(),
      updatedAt: Date.now()
    };
    dataStore.chats.unshift(chat);
    activeChatId = chat.id;
    localStorage.setItem(ACTIVE_CHAT_KEY, activeChatId);
    saveStore();
    renderAll();
    addSystemWelcome();
    closeDrawer();
  }

  function clearCurrentChat(){
    const chat = getCurrentChat();
    if(!chat){
      newChat();
      return;
    }
    chat.messages = [];
    chat.title = 'New Chat';
    chat.updatedAt = Date.now();
    saveStore();
    renderAll();
    addSystemWelcome();
  }

  function addSystemWelcome(){
    const chat = getCurrentChat();
    if(!chat) return;
    if(chat.messages.length === 0){
      chat.messages.push({ role:'assistant', type:'text', content:'سلام! زه تیار یم. خپله پوښتنه وکړه.' });
      chat.updatedAt = Date.now();
      saveStore();
      renderMessages();
    }
  }

  function quickAsk(text){
    lastInputSource = 'typed';
    userInput.value = text;
    sendMessage();
  }

    function clearImage(){
       uploadedImage = null;
       selectedImageBase64 = null;
       selectedImageMime = null;
       imageInput.value = '';
       previewWrap.style.display = 'none';
       previewWrap.innerHTML = '';
     }

  function renderChatList(){
    chatList.innerHTML = '';
    const chats = [...getChats()].sort((a,b) => b.updatedAt - a.updatedAt);

    if(chats.length === 0){
      const empty = document.createElement('div');
      empty.style.padding = '10px 8px';
      empty.style.color = 'var(--muted)';
      empty.style.fontSize = '13px';
      empty.textContent = 'No chats yet';
      chatList.appendChild(empty);
      return;
    }

    chats.forEach(chat => {
      const btn = document.createElement('button');
      btn.className = 'chat-item' + (chat.id === activeChatId ? ' active' : '');
      btn.onclick = () => setActiveChat(chat.id);

      const title = document.createElement('div');
      title.className = 'title';
      title.textContent = chat.title || 'New Chat';

      const meta = document.createElement('div');
      meta.className = 'meta';
      const lastMsg = chat.messages[chat.messages.length - 1]?.content || 'No messages yet';
      meta.textContent = typeof lastMsg === 'string' ? lastMsg : '[image]';

      btn.appendChild(title);
      btn.appendChild(meta);
      chatList.appendChild(btn);
    });
  }

  function renderMessages(){
    chatBox.innerHTML = '';
    const chat = getCurrentChat();
    if(!chat) return;

    chat.messages.forEach(msg => {
      if(msg.type === 'image'){
        addImageMessage(msg.content, msg.role === 'user' ? 'user' : 'bot', false);
      }else{
        addMessage(msg.content, msg.role === 'user' ? 'user' : 'bot', false);
      }
    });

    if(chat.messages.length === 0){
      addMessage('سلام! زه تیار یم. خپله پوښتنه وکړه.', 'bot', false);
    }

    chatTitle.textContent = chat.title || 'New Chat';
    chatSubtitle.textContent = 'Replies match the language of your message';
    chatBox.scrollTop = chatBox.scrollHeight;
  }

  function renderAll(){
    renderChatList();
    renderMessages();
  }

  function detectLanguage(text){
    const t = text.trim();
    if(!t) return 'unknown';

    const pashtoLike = /[\u0600-\u06FF]/.test(t);
    const latin = /[A-Za-z]/.test(t);

    if(pashtoLike && !latin) return 'ps';
    if(latin && !pashtoLike) return 'en';
    if(pashtoLike && latin) return 'mixed';
    return 'unknown';
  }

  function buildSystemPrompt(userMessage){
    const lang = detectLanguage(userMessage);
    const langHint = lang === 'ps'
      ? 'The user wrote in Pashto, so answer only in Pashto.'
      : lang === 'en'
        ? 'The user wrote in English, so answer only in English.'
        : 'Use the same language as the user if possible.';

    return SYSTEM_PROMPT + '\n' + langHint;
  }

  function copyText(btn){
  const text = btn.parentElement.parentElement.querySelector('.msg-text').innerText;

  navigator.clipboard.writeText(text).then(()=>{
    btn.textContent = "Copied ✅";
    setTimeout(()=>{
      btn.textContent = "📋 Copy";
    }, 1500);
  });
  }

  function likeMessage(btn){
  btn.textContent = "Liked 👍";
  btn.style.color = "green";
 }

  function addMessage(text, sender, save=true){
    const div = document.createElement('div');
    div.className = `message ${sender}`;
    if(sender === 'bot'){
    div.innerHTML = `
      <div class="msg-text">${text}</div>
      <div class="msg-actions">
        <button onclick="copyText(this)">📋 Copy</button>
        <button onclick="likeMessage(this)">👍 Like</button>
      </div>
     `;
    }else{
      div.textContent = text;
    }
    chatBox.appendChild(div);
    chatBox.scrollTop = chatBox.scrollHeight;

    if(save){
      const chat = ensureChat();
      chat.messages.push({ role: sender === 'user' ? 'user' : 'assistant', type:'text', content: text });
      chat.updatedAt = Date.now();
      if(sender === 'user' && chat.title === 'New Chat'){
        chat.title = text.length > 32 ? text.slice(0, 32) + '…' : text;
      }
      saveStore();
      renderChatList();
    }

    return div;
  }


  function addImageMessage(src, sender, save=true){
    const div = document.createElement('div');
    div.className = `message ${sender}`;
    div.innerHTML = `<img src="${src}" class="chat-image" alt="image" />`;
    chatBox.appendChild(div);
    chatBox.scrollTop = chatBox.scrollHeight;

    if(save){
      const chat = ensureChat();
      chat.messages.push({ role: sender === 'user' ? 'user' : 'assistant', type:'image', content: src });
      chat.updatedAt = Date.now();
      saveStore();
      renderChatList();
    }

    return div;
  }

  function addTyping(){
    const div = document.createElement('div');
    div.className = 'message bot';
    div.id = 'typingBubble';
    div.innerHTML = `
      <div class="typing">
        <span></span>
        <span></span>
        <span></span>
      </div>
    `;
    chatBox.appendChild(div);
    chatBox.scrollTop = chatBox.scrollHeight;
    return div;
  }

    let selectedImageBase64 = null;
    let selectedImageMime = null;

 imageInput.addEventListener('change', (e) => {
  const file = e.target.files[0];
  if(!file) return;

  const reader = new FileReader();

  reader.onload = () => {
    uploadedImage = reader.result;
    selectedImageBase64 = reader.result;
    selectedImageMime = file.type;

    previewWrap.style.display = 'block';
    previewWrap.innerHTML = `
      <div class="preview-card">
        <button class="remove-preview" onclick="clearImage()">×</button>
        <img src="${reader.result}" alt="Preview" />
      </div>
    `;
  };

  reader.readAsDataURL(file);
});
     

  function isImageGenerationPrompt(text){
    return /(?:\b(generate|create|make|draw|design|illustrate|picture|photo|image|art)\b|تصویر جوړ کړه|عکس جوړ کړه|انځور جوړ کړه|انځور|عکس|تصویر)/i.test(text);
  }

  async function sendMessage(){

   const message = userInput.value.trim();

// ✅ CREATOR CHECK
if(checkCreatorQuestion(message)){
  const lang = detectLanguage(message);
  const answer = getCreatorAnswer(lang === 'ps' ? 'ps' : 'en');
  addMessage(message, 'user', true);
  addMessage(answer, 'bot', true);
  userInput.value = '';
  return;
}

 if(isImageGenerationPrompt(message)){
   await generateImage(message);
   userInput.value = '';
   return;
}

  const hasImage = !!uploadedImage;

  if(!message && !hasImage) return;

    const shouldSpeak = lastInputSource === 'voice';
    lastInputSource = 'typed';

    ensureChat();

    if(message){
      addMessage(message, 'user', true);
    }

    if(hasImage && !message){
      addImageMessage(uploadedImage, 'user', true);
    }

    userInput.value = '';

    const typingBubble = addTyping();

    try{
      if(message && isImageGenerationPrompt(message) && !hasImage){
        typingBubble.textContent = 'تصویر جوړیږي...';

        const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
          method:'POST',
          headers:{
            'Authorization': `Bearer ${API_KEY}`,
            'Content-Type':'application/json'
          },
          body: JSON.stringify({
            model: IMAGE_MODEL,
            messages: [
              { role:'user', content: message }
            ],
            modalities: ['image','text'],
            stream: false,
            image_config: {
              aspect_ratio: '1:1',
              image_size: '1K'
            }
          })
        });

        const data = await response.json();
        const imageUrl = data?.choices?.[0]?.message?.images?.[0]?.imageUrl?.url
          || data?.choices?.[0]?.message?.images?.[0]?.image_url?.url
          || null;
        const textReply = data?.choices?.[0]?.message?.content || '';

        typingBubble.remove();

        if(imageUrl){
          addImageMessage(imageUrl, 'bot', true);
        }else{
          addMessage(textReply || 'تصویر جوړ نه شو', 'bot', true);
        }

        if(textReply){
          addMessage(textReply, 'bot', true);
        }

        clearImage();
        return;
      }

      const chat = getCurrentChat();
      const history = (chat?.messages || []).slice(-5).map(m => ({
        role: m.role,
        content: m.type === 'image'
          ? [{ type:'image_url', image_url:{ url: m.content } }]
          : m.content
      }));

      let payloadMessages = [
        { role:'system', content: buildSystemPrompt(message || 'Analyze the attached image.') },
        ...history
      ];

      if(hasImage){
        payloadMessages.push({
          role:'user',
          content:[
            {
              type:'text',
              text: message || 'دغه تصویر تشریح کړه او مهم جزئیات یې ووایه.'
            },
            {
              type:'image_url',
              image_url:{ url: uploadedImage }
            }
          ]
        });
      }else{
        payloadMessages.push({
          role:'user',
          content: message
        });
      }

      const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method:'POST',
        headers:{
          'Authorization': `Bearer ${API_KEY}`,
          'Content-Type':'application/json'
        },
        body: JSON.stringify({
          model: CHAT_MODEL,
          stream: true,
          temperature: 0.4,
          max_tokens: 300,
          messages: payloadMessages
        })
      });

      if(!response.ok){
        const errText = await response.text();
        throw new Error(errText || `HTTP ${response.status}`);
      }

      const assistantText = await readStreamingResponse(response, typingBubble);
      const current = getCurrentChat();
      current.messages.push({ role:'assistant', type:'text', content: assistantText });
      current.updatedAt = Date.now();
      saveStore();
      renderChatList();
      chatTitle.textContent = current.title || 'New Chat';

      if(shouldSpeak){
        speak(assistantText);
      }

      clearImage();
    }catch(error){
      console.error('AI error:', error);
      typingBubble.textContent = 'No Internet Connection or AI service is down';
    }

    selectedImageBase64 = null;
    selectedImageMime = null;
    imageInput.value = '';
  }

  <!-- this is method for generating image using pollinations.ai with prompt translation -->
   async function generateImage(prompt){

  const typing = addTyping();
  typing.textContent = "🎨 تصویر جوړیږي...";

  try{

    // ✅ translate prompt to English first
    let finalPrompt = prompt;

    const translateResponse = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method:'POST',
      headers:{
        'Authorization': `Bearer ${API_KEY}`,
        'Content-Type':'application/json'
      },
      body: JSON.stringify({
        model: CHAT_MODEL,
        messages: [
          {
            role:'system',
            content: `
Translate the user's image request into clean English for AI image generation.

Rules:
- ONLY return the English image prompt.
- Do NOT explain anything.
- Understand Pashto correctly.
- Example:
"د مڼې تصویر جوړ کړه"
→ "A realistic red apple"

"د زمري عکس جوړ کړه"
→ "A realistic lion"
            `
          },
          {
            role:'user',
            content: prompt
          }
        ],
        temperature: 0.3,
        max_tokens: 300
      })
    });

    const translateData = await translateResponse.json();

    finalPrompt =
      translateData?.choices?.[0]?.message?.content?.trim() || prompt;

    console.log("Translated Prompt:", finalPrompt);

    // ✅ generate image using English prompt
   const imageUrl =
      `https://image.pollinations.ai/prompt/${encodeURIComponent(
        "STRICT: generate exactly this → " + prompt
      )}?seed=${Date.now()}`;

    await new Promise(resolve => setTimeout(resolve, 4000));

    typing.remove();

    const div = document.createElement('div');
    div.className = 'message bot';

    div.innerHTML = `
      <div style="margin-bottom:10px;">
        🎨 Generated Image
      </div>

      <img
        src="${imageUrl}"
        class="chat-image"
        alt="Generated Image"
        loading="lazy"
        referrerpolicy="no-referrer"
        onerror="this.onerror=null; this.style.display='none';"
      >

      <button
        class="btn"
        style="margin-top: 8px; padding: 4px 6px; font-size: 10px; border-radius: 10px; background: var(--accent); color: #fff;"
        onclick="downloadGeneratedImage('${imageUrl}', this)"
      >
        💾 Save
      </button>
    `;

    chatBox.appendChild(div);
    chatBox.scrollTop = chatBox.scrollHeight;

  }catch(err){

    console.error(err);

    typing.textContent = "❌ Image generation failed";
  }
}

async function downloadGeneratedImage(url, btn) {
  try {
    const response = await fetch(url);
    const blob = await response.blob();

    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `quraishi_ai_${Date.now()}.jpg`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);

    // ✅ Change button text
    if(btn){
      btn.textContent = "Saved ✅";
      btn.disabled = true;
    }

  } catch (err) {
    console.error(err);
    alert("Download failed");
  }
}

  async function readStreamingResponse(response, bubbleEl){
    const reader = response.body.getReader();
    const decoder = new TextDecoder('utf-8');
    let buffer = '';
    let fullText = '';

    while(true){
      const { value, done } = await reader.read();
      if(done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop();

      for(const line of lines){
        const trimmed = line.trim();
        if(!trimmed.startsWith('data:')) continue;

        const data = trimmed.replace(/^data:\s*/, '');
        if(data === '[DONE]') continue;

        try{
          const parsed = JSON.parse(data);
          const delta = parsed?.choices?.[0]?.delta?.content || '';
          if(delta){
            fullText += delta;
            bubbleEl.textContent = fullText;
            chatBox.scrollTop = chatBox.scrollHeight;
          }
        }catch(e){}
      }
    }

    if(!fullText){
      fullText = 'ما ځواب ونه موند.';
      bubbleEl.textContent = fullText;
    }

    return fullText;
  }

  function speak(text){
    if(!('speechSynthesis' in window)) return;
    if(!text || !text.trim()) return;

    window.speechSynthesis.cancel();
    const utter = new SpeechSynthesisUtterance(text);
    utter.lang = 'ps-AF';
    utter.rate = 1;
    utter.pitch = 1;
    window.speechSynthesis.speak(utter);
  }

  function toggleVoice(){
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;

  if(!SR){
    addMessage('Voice not supported in this browser', 'bot');
    return;
  }

  if(!recognition){
    recognition = new SR();
    recognition.lang = 'auto'; // ✅ auto detect
    recognition.interimResults = false;
    recognition.continuous = false;

    recognition.onresult = (event) => {
      const text = event.results[0][0].transcript;
      userInput.value = text;
      lastInputSource = 'voice';
    };

    recognition.onerror = () => {
      recording = false;
      voiceBtn.classList.remove('recording');
    };

    recognition.onend = () => {
      recording = false;
      voiceBtn.classList.remove('recording');
    };
  }

  if(!recording){
    recognition.start();
    recording = true;
    voiceBtn.classList.add('recording');
  }else{
    recognition.stop();
  }
}


  userInput.addEventListener('input', () => {
    if(!recording){
      lastInputSource = 'typed';
    }
  });

  userInput.addEventListener('keydown', (e) => {
    if(e.key === 'Enter' && !e.shiftKey){
      e.preventDefault();
      sendMessage();
    }
  });

  window.addEventListener('resize', () => {
    if(window.innerWidth > 900){
      closeDrawer();
    }
  });

  if(!activeChatId || !getCurrentChat()){
    newChat();
  }else{
    renderAll();
  }


// ✅ SPECIAL CREATOR ANSWER
function checkCreatorQuestion(text){
  const q = text.toLowerCase();

  if(
    q.includes("who created you") ||
    q.includes("who created u") ||
    q.includes("چا جوړ کړی") ||
    q.includes("چا جوړ کړی یی") ||
    q.includes("ته چا جوړ کړی") ||
    q.includes("ته چا جوړ کړی یی") ||
    q.includes("ستا جوړونکی څوک دی")
  ){
    return true;
  }
  return false;
}

function getCreatorAnswer(lang){
  if(lang === 'ps'){
    return "زه دافغانستان د ننګرهار ولایت یو سافټویر انجینر جوړ کړی یم. د هغه نوم عبدالله مین قریشي دی.";
  }
  return "The person who created me is actually a Software Engineer from Nangarhar Province, Afghanistan. His name is Abdullah Amin Quraishi";
}
