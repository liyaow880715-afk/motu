const baseUrl = 'https://api.yijiarj.cn/v1';
const apiKey = 'sk-FL3LGnZ8JDUDA9fgAhQt2JXaJkD8ZgGcAcVg6b6I4X3tnTLg';

async function test(path, body) {
  console.log('\n--- POST', baseUrl + path);
  try {
    const res = await fetch(baseUrl + path, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify(body),
    });
    const text = await res.text();
    console.log('Status:', res.status);
    console.log('Body:', text.slice(0, 3000));
  } catch (e) {
    console.log('Error:', e.message);
  }
}

async function main() {
  // Test 1: Standard OpenAI DALL-E format
  await test('/images/generations', {
    model: 'image2',
    prompt: 'A cute cat sitting on a sofa, photorealistic',
    size: '1024x1024',
    n: 1,
    response_format: 'url',
  });

  // Test 2: With quality and style (DALL-E 3)
  await test('/images/generations', {
    model: 'image2',
    prompt: 'A cute cat sitting on a sofa, photorealistic',
    size: '1024x1024',
    n: 1,
    quality: 'standard',
    style: 'vivid',
  });

  // Test 3: Try chat completions with image generation (some providers support this)
  await test('/chat/completions', {
    model: 'image2',
    messages: [
      { role: 'user', content: 'Generate an image of a cute cat on a sofa' }
    ],
  });

  // Test 4: Try with b64_json
  await test('/images/generations', {
    model: 'image2',
    prompt: 'A cute cat',
    size: '1024x1024',
    n: 1,
    response_format: 'b64_json',
  });

  // Test 5: List all endpoints available
  console.log('\n--- GET /models');
  try {
    const res = await fetch(baseUrl + '/models', {
      headers: { 'Authorization': `Bearer ${apiKey}` },
    });
    const text = await res.text();
    console.log('Status:', res.status);
    const data = JSON.parse(text);
    console.log('Models:', JSON.stringify(data.data?.map(m => m.id), null, 2));
  } catch (e) {
    console.log('Error:', e.message);
  }
}

main();
