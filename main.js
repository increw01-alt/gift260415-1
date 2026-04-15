function getColorClass(num) {
  if (num <= 10) return 'c1';
  if (num <= 20) return 'c2';
  if (num <= 30) return 'c3';
  if (num <= 40) return 'c4';
  return 'c5';
}

function generate() {
  const ballsEl = document.getElementById('balls');
  const historyEl = document.getElementById('history');
  const historyList = document.getElementById('historyList');

  // 1~45 중 랜덤 6개 뽑기
  const pool = [];
  for (let i = 1; i <= 45; i++) pool.push(i);

  const picked = [];
  for (let i = 0; i < 6; i++) {
    const idx = Math.floor(Math.random() * pool.length);
    picked.push(pool.splice(idx, 1)[0]);
  }
  picked.sort((a, b) => a - b);

  // 공 표시
  ballsEl.innerHTML = '';
  picked.forEach((num, i) => {
    setTimeout(() => {
      const ball = document.createElement('div');
      ball.className = 'ball ' + getColorClass(num);
      ball.textContent = num;
      ballsEl.appendChild(ball);
    }, i * 150);
  });

  // 기록 추가
  const now = new Date();
  const timeStr = now.getHours().toString().padStart(2, '0') + ':' +
                  now.getMinutes().toString().padStart(2, '0') + ':' +
                  now.getSeconds().toString().padStart(2, '0');

  const li = document.createElement('li');
  li.innerHTML =
    '<span class="nums">' + picked.join(', ') + '</span>' +
    '<span class="time">' + timeStr + '</span>';
  historyList.insertBefore(li, historyList.firstChild);

  historyEl.classList.add('show');
}
