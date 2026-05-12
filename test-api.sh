#!/bin/bash
set -e
KEY="sk-FL3LGnZ8JDUDA9fgAhQt2JXaJkD8ZgGcAcVg6b6I4X3tnTLg"
URL="https://api.yijiarj.cn/v1/chat/completions"

echo "=== Test 1: No size param ==="
curl -s "$URL" \
  -H "Authorization: Bearer $KEY" \
  -H "Content-Type: application/json" \
  -d '{"model":"image2-2k","messages":[{"role":"user","content":"generate a 9:16 e-commerce product photo of a white t-shirt, minimal style"}],"max_tokens":4096}' | python3 -c "import sys,json; d=json.load(sys.stdin); c=d.get('choices',[{}])[0].get('message',{}).get('content',''); print(c[:300])"

echo ""
echo "=== Test 2: With size=1152x2048 ==="
curl -s "$URL" \
  -H "Authorization: Bearer $KEY" \
  -H "Content-Type: application/json" \
  -d '{"model":"image2-2k","messages":[{"role":"user","content":"generate a 9:16 e-commerce product photo of a white t-shirt, minimal style"}],"max_tokens":4096,"size":"1152x2048"}' | python3 -c "import sys,json; d=json.load(sys.stdin); c=d.get('choices',[{}])[0].get('message',{}).get('content',''); print(c[:300])"

echo ""
echo "=== Test 3: With aspect_ratio=9:16 ==="
curl -s "$URL" \
  -H "Authorization: Bearer $KEY" \
  -H "Content-Type: application/json" \
  -d '{"model":"image2-2k","messages":[{"role":"user","content":"generate a 9:16 e-commerce product photo of a white t-shirt, minimal style"}],"max_tokens":4096,"aspect_ratio":"9:16"}' | python3 -c "import sys,json; d=json.load(sys.stdin); c=d.get('choices',[{}])[0].get('message',{}).get('content',''); print(c[:300])"

echo ""
echo "=== Test 4: With size=1024x1536 (old value) ==="
curl -s "$URL" \
  -H "Authorization: Bearer $KEY" \
  -H "Content-Type: application/json" \
  -d '{"model":"image2-2k","messages":[{"role":"user","content":"generate a 9:16 e-commerce product photo of a white t-shirt, minimal style"}],"max_tokens":4096,"size":"1024x1536"}' | python3 -c "import sys,json; d=json.load(sys.stdin); c=d.get('choices',[{}])[0].get('message',{}).get('content',''); print(c[:300])"

echo ""
echo "=== Test 5: With size=9:16 (ratio string) ==="
curl -s "$URL" \
  -H "Authorization: Bearer $KEY" \
  -H "Content-Type: application/json" \
  -d '{"model":"image2-2k","messages":[{"role":"user","content":"generate a 9:16 e-commerce product photo of a white t-shirt, minimal style"}],"max_tokens":4096,"size":"9:16"}' | python3 -c "import sys,json; d=json.load(sys.stdin); c=d.get('choices',[{}])[0].get('message',{}).get('content',''); print(c[:300])"

echo ""
echo "=== Test 6: With size=1:1 (ratio string) ==="
curl -s "$URL" \
  -H "Authorization: Bearer $KEY" \
  -H "Content-Type: application/json" \
  -d '{"model":"image2-2k","messages":[{"role":"user","content":"generate a 1:1 e-commerce product photo of a white t-shirt, minimal style"}],"max_tokens":4096,"size":"1:1"}' | python3 -c "import sys,json; d=json.load(sys.stdin); c=d.get('choices',[{}])[0].get('message',{}).get('content',''); print(c[:300])"

echo ""
echo "=== Test 7: With size=3:4 (ratio string) ==="
curl -s "$URL" \
  -H "Authorization: Bearer $KEY" \
  -H "Content-Type: application/json" \
  -d '{"model":"image2-2k","messages":[{"role":"user","content":"generate a 3:4 e-commerce product photo of a white t-shirt, minimal style"}],"max_tokens":4096,"size":"3:4"}' | python3 -c "import sys,json; d=json.load(sys.stdin); c=d.get('choices',[{}])[0].get('message',{}).get('content',''); print(c[:300])"

echo ""
echo "=== Test 5: With image generation endpoint /images/generations ==="
curl -s "https://api.yijiarj.cn/v1/images/generations" \
  -H "Authorization: Bearer $KEY" \
  -H "Content-Type: application/json" \
  -d '{"model":"image2-2k","prompt":"a white t-shirt, minimal style","size":"1152x2048"}' | python3 -c "import sys,json; d=json.load(sys.stdin); print(str(d)[:300])"
