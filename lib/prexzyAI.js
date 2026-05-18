import axios from 'axios';

const POLLINATIONS_TEXT = 'https://text.pollinations.ai';
const POLLINATIONS_IMAGE = 'https://image.pollinations.ai/prompt';

const AI_MODELS = {
  'ai4chat':      { model: 'openai',   name: 'AI4Chat',            description: 'General AI assistant' },
  'gpt41':        { model: 'openai',   name: 'GPT-4.1',            description: 'Most advanced GPT-4.1' },
  'gpt41nano':    { model: 'openai',   name: 'GPT-4.1 Nano',       description: 'Fast GPT-4.1 responses' },
  'gpt41mini':    { model: 'openai',   name: 'GPT-4.1 Mini',       description: 'Fastest GPT-4.1 responses' },
  'gpt4o':        { model: 'openai',   name: 'GPT-4o',             description: 'Best overall performance' },
  'gpt4omini':    { model: 'openai',   name: 'GPT-4o Mini',        description: 'Quick and efficient' },
  'o1':           { model: 'openai',   name: 'O1',                 description: 'Advanced reasoning model' },
  'o1mini':       { model: 'openai',   name: 'O1 Mini',            description: 'Fast reasoning model' },
  'o3mini':       { model: 'openai',   name: 'O3 Mini',            description: 'Compact reasoning model' },
  'o4mini':       { model: 'openai',   name: 'O4 Mini',            description: 'Newest reasoning model' },
  'o3':           { model: 'openai',   name: 'O3',                 description: 'Most powerful reasoning' },
  'chatgpt4o':    { model: 'openai',   name: 'ChatGPT-4o Latest',  description: 'Most up-to-date ChatGPT' },
  'gpt4':         { model: 'openai',   name: 'GPT-4',              description: 'Standard GPT-4 model' },
  'gpt4turbo':    { model: 'openai',   name: 'GPT-4 Turbo',        description: 'Fast GPT-4 turbo' },
  'gpt35turbo':   { model: 'openai',   name: 'GPT-3.5 Turbo',      description: 'Fast and efficient' },
  'gpt5nano':     { model: 'openai',   name: 'GPT-5 Nano',         description: 'Latest GPT-5 Nano' },
  'gpt5':         { model: 'openai',   name: 'GPT-5',              description: 'Advanced GPT-5 model' },
  'gemini':       { model: 'openai',   name: 'Google Gemini',      description: "Google's Gemini AI" },
  'deepseek':     { model: 'mistral',  name: 'DeepSeek',           description: 'DeepSeek AI model' },
  'claude':       { model: 'mistral',  name: 'Claude AI',          description: "Anthropic's Claude" },
  'grok':         { model: 'openai',   name: 'Grok AI',            description: "xAI's Grok model" },
  'metaai':       { model: 'openai',   name: 'Meta AI',            description: "Meta's Llama AI" },
  'qwen':         { model: 'openai',   name: 'Qwen AI',            description: "Alibaba's Qwen model" },
  'copilot':      { model: 'openai',   name: 'Microsoft Copilot',  description: 'Microsoft Copilot AI' },
  'copilotthink': { model: 'openai',   name: 'Copilot Think Deep', description: 'Deep thinking mode' },
  'chatgpt':      { model: 'openai',   name: 'ChatGPT',            description: 'OpenAI ChatGPT' },
  'chataibot':    { model: 'openai',   name: 'ChatAIBot',          description: 'Free AI chatbot' }
};

const IMAGE_MODELS = {
  'ai4chatimg': { style: '',                                           name: 'AI4Chat Image',  description: 'Generate images with AI' },
  'dalle':      { style: 'ultra realistic, 4k, highly detailed',       name: 'DALL-E 3 XL',    description: 'Photorealistic image generation' },
  'txt2img':    { style: 'high quality, detailed, vibrant',            name: 'Text to Image',  description: 'Generate images from text' },
  'aidocimg':   { style: 'professional quality, sharp, clean',         name: 'Aidoc Image',    description: 'AI document/concept image' }
};

async function queryAI(modelKey, prompt) {
  const model = AI_MODELS[modelKey];
  if (!model) throw new Error(`Unknown AI model: ${modelKey}`);

  try {
    const encodedPrompt = encodeURIComponent(prompt);
    const seed = Math.floor(Math.random() * 99999);
    const response = await axios.get(
      `${POLLINATIONS_TEXT}/${encodedPrompt}?model=${model.model}&seed=${seed}`,
      {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          'Accept': 'text/plain, */*'
        },
        timeout: 60000,
        responseType: 'text'
      }
    );

    const text = typeof response.data === 'string' ? response.data.trim() : String(response.data || '').trim();
    if (text.length > 0) return text;
    throw new Error('Empty response from AI');
  } catch (error) {
    if (error.response?.status === 429) throw new Error('AI is busy. Please try again in a moment.');
    if (error.code === 'ETIMEDOUT' || error.code === 'ECONNABORTED') throw new Error('Request timed out. Please try again.');
    if (error.code === 'ENOTFOUND' || error.code === 'ECONNREFUSED') throw new Error('AI service is currently unreachable. Please try again later.');
    throw error;
  }
}

async function generateImage(modelKey, prompt, options = {}) {
  const styleInfo = IMAGE_MODELS[modelKey] || { style: '', name: modelKey };
  const fullPrompt = styleInfo.style ? `${prompt}, ${styleInfo.style}` : prompt;
  const encodedPrompt = encodeURIComponent(fullPrompt);
  const width = options.width || 1024;
  const height = options.height || 1024;
  const seed = Math.floor(Math.random() * 99999);
  return `${POLLINATIONS_IMAGE}/${encodedPrompt}?width=${width}&height=${height}&model=flux&seed=${seed}&nologo=true&enhance=true`;
}

function getModelInfo(modelKey)      { return AI_MODELS[modelKey]  ? { ...AI_MODELS[modelKey],  key: modelKey } : null; }
function getImageModelInfo(modelKey) { return IMAGE_MODELS[modelKey] ? { ...IMAGE_MODELS[modelKey], key: modelKey } : null; }
function getAllModels()      { return AI_MODELS; }
function getAllImageModels() { return IMAGE_MODELS; }
function getModelList()      { return Object.entries(AI_MODELS).map(([key, info])  => ({ key, name: info.name, description: info.description })); }
function getImageModelList() { return Object.entries(IMAGE_MODELS).map(([key, info]) => ({ key, name: info.name, description: info.description })); }

export {
  queryAI,
  generateImage,
  getModelInfo,
  getImageModelInfo,
  getAllModels,
  getAllImageModels,
  getModelList,
  getImageModelList,
  AI_MODELS,
  IMAGE_MODELS
};
