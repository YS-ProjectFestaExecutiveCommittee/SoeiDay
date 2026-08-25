document.addEventListener("DOMContentLoaded", () => {
    
    fetch('https://www.soei-fes.com/associated/header.html')
        .then(response => response.text())
        .then(data => {
            document.getElementById('header-placeholder').innerHTML = data;
        })
        .catch(error => console.error('ヘッダーの読み込みに失敗しました:', error));

    
    fetch('https://www.soei-fes.com/associated/footer.html')
        .then(response => response.text())
        .then(data => {
            document.getElementById('footer-placeholder').innerHTML = data;
        })
        .catch(error => console.error('フッターの読み込みに失敗しました:', error));
});
