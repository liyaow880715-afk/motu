async function test() {
  const key1 = 'BM-BW-GXVYPQ7-NQ11A';

  // Get project list
  const res1 = await fetch('http://localhost:3000/api/projects', {
    headers: { 'x-access-key': key1 }
  });
  const data1 = await res1.json();
  console.log('key1 projects:', data1.data.length);

  if (data1.data.length > 0) {
    const projectId = data1.data[0].id;
    console.log('projectId:', projectId);

    // Get project detail with key
    const res2 = await fetch(`http://localhost:3000/api/projects/${projectId}`, {
      headers: { 'x-access-key': key1 }
    });
    const data2 = await res2.json();
    console.log('detail with key:', data2.success ? 'OK' : data2.error?.message);

    // Get project detail without key
    const res3 = await fetch(`http://localhost:3000/api/projects/${projectId}`);
    const data3 = await res3.json();
    console.log('detail without key:', data3.success ? 'OK' : data3.error?.message);
  }
}

test().catch(console.error);
