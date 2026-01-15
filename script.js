const form = document.getElementById('imageForm');
const generateBtn = document.getElementById('generateBtn');
const resultSection = document.getElementById('resultSection');
const loading = document.getElementById('loading');
const errorMessage = document.getElementById('errorMessage');
const errorText = document.getElementById('errorText');
const imageResult = document.getElementById('imageResult');
const generatedImage = document.getElementById('generatedImage');
const downloadBtn = document.getElementById('downloadBtn');

// API Configuration - Using Hugging Face's FREE Inference API
// Multiple models to try if one fails
const MODELS = [
    'stabilityai/stable-diffusion-2-1',
    'runwayml/stable-diffusion-v1-5',
    'CompVis/stable-diffusion-v1-4'
];

let currentImageUrl = '';
let currentModelIndex = 0;

// Style modifiers for different artistic styles
const STYLE_MODIFIERS = {
    1: 'photorealistic, highly detailed, 8k, professional photography',
    2: 'artistic, painterly, beautiful art, masterpiece',
    3: 'anime style, manga, vibrant colors, detailed anime art',
    4: 'cinematic, dramatic lighting, movie scene, epic composition',
    5: '3d render, octane render, unreal engine, highly detailed 3d'
};

// Form submission handler
form.addEventListener('submit', async (e) => {
    e.preventDefault();

    // Get form values
    const prompt = document.getElementById('prompt').value.trim();
    const styleId = parseInt(document.getElementById('style').value);
    const size = document.getElementById('size').value;

    if (!prompt) {
        showError('Please enter a description for your image');
        return;
    }

    // Generate image
    await generateImage(prompt, styleId, size);
});

// Fast, reliable models optimized for speed
const FAST_MODELS = [
    'black-forest-labs/FLUX.1-schnell',  // Fastest model
    'stabilityai/stable-diffusion-2-1',
    'prompthero/openjourney-v4'
];

// Generate image function with multiple fallback strategies
async function generateImage(prompt, styleId, size) {
    // Show loading state
    hideAllStates();
    loading.classList.add('active');
    generateBtn.disabled = true;
    generateBtn.innerHTML = `
        <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
            <circle cx="10" cy="10" r="8" stroke="currentColor" stroke-width="2" fill="none" opacity="0.3"/>
            <path d="M10 2C14.4183 2 18 5.58172 18 10" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
        </svg>
        <span>Generating...</span>
    `;

    // Enhance prompt with style modifier
    const styleModifier = STYLE_MODIFIERS[styleId] || '';
    const enhancedPrompt = `${prompt}, ${styleModifier}, high quality, detailed, masterpiece`;

    // Determine dimensions based on aspect ratio
    let width = 1024;
    let height = 1024;

    if (size === '16-9') {
        width = 1024;
        height = 576;
    } else if (size === '9-16') {
        width = 576;
        height = 1024;
    }

    try {
        // Strategy 1: Try Pollinations.AI with validation
        console.log('Trying Pollinations.AI...');
        const encodedPrompt = encodeURIComponent(enhancedPrompt);

        // Use Pollinations.AI with specific model parameter to avoid promotional content
        const pollinationsUrl = `https://image.pollinations.ai/prompt/${encodedPrompt}?width=${width}&height=${height}&nologo=true&model=flux&seed=${Date.now()}`;

        // Test if the image loads properly
        const img = new Image();
        const imageLoaded = await new Promise((resolve) => {
            img.onload = () => {
                // Check if it's a real image (not a tiny promotional banner)
                if (img.naturalWidth >= width * 0.8 && img.naturalHeight >= height * 0.8) {
                    console.log('Pollinations.AI succeeded');
                    resolve(true);
                } else {
                    console.log('Pollinations returned promotional content');
                    resolve(false);
                }
            };
            img.onerror = () => {
                console.log('Pollinations.AI failed to load');
                resolve(false);
            };

            // Set timeout for slow responses
            setTimeout(() => {
                if (!img.complete) {
                    console.log('Pollinations.AI timed out');
                    resolve(false);
                }
            }, 15000); // 15 second timeout

            img.src = pollinationsUrl;
        });

        if (imageLoaded) {
            currentImageUrl = pollinationsUrl;
            showImage(pollinationsUrl);
            return;
        }

        // Strategy 2: Try alternative free API (Replicate via public endpoint)
        console.log('Trying alternative API...');
        const altUrl = `https://api.deepai.org/api/text2img`;

        const formData = new FormData();
        formData.append('text', enhancedPrompt);

        const response = await fetch(altUrl, {
            method: 'POST',
            headers: {
                'api-key': 'quickstart-QUdJIGlzIGNvbWluZy4uLi4K' // Public demo key
            },
            body: formData
        });

        if (response.ok) {
            const data = await response.json();
            if (data.output_url) {
                console.log('Alternative API succeeded');
                currentImageUrl = data.output_url;
                showImage(data.output_url);
                return;
            }
        }

        // If all strategies fail
        throw new Error('All image generation services are currently unavailable');

    } catch (error) {
        console.error('Error generating image:', error);
        showError('Unable to generate image at the moment. Please try again in a few seconds. The free APIs may be experiencing high traffic.');
    } finally {
        // Reset button
        generateBtn.disabled = false;
        generateBtn.innerHTML = `
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M10 3L13 10L10 17L7 10L10 3Z" fill="currentColor"/>
            </svg>
            <span>Generate Image</span>
        `;
    }
}

// Show image
function showImage(imageUrl) {
    hideAllStates();
    generatedImage.src = imageUrl;
    imageResult.classList.add('active');
}

// Show error
function showError(message) {
    hideAllStates();
    errorText.textContent = message;
    errorMessage.classList.add('active');
}

// Hide all states
function hideAllStates() {
    loading.classList.remove('active');
    errorMessage.classList.remove('active');
    imageResult.classList.remove('active');
}

// Download button handler
downloadBtn.addEventListener('click', async () => {
    if (!currentImageUrl) return;

    try {
        // Fetch the image
        const response = await fetch(currentImageUrl);
        const blob = await response.blob();

        // Create download link
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `ai-generated-${Date.now()}.png`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
    } catch (error) {
        console.error('Error downloading image:', error);
        showError('Failed to download image. Please try right-clicking and saving the image instead.');
    }
});

// Add spinning animation to loading button
const style = document.createElement('style');
style.textContent = `
    @keyframes buttonSpin {
        to { transform: rotate(360deg); }
    }
    .generate-btn:disabled svg {
        animation: buttonSpin 1s linear infinite;
    }
`;
document.head.appendChild(style);
