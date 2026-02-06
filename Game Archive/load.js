prog = 0;
function loadbar() {
    if (prog > 100) {
        clearInterval(inter);
        document.getElementById('content').style = '';
        loadgame();
    } else {
        prog++;
        document.getElementById('progbar').value = prog;
    }
}
let inter;
window.addEventListener('load', () => {
    document.getElementById('content').innerHTML = 'Loading game...<br><progress max=100 value=0 id="progbar"></progress>';
    document.getElementById('content').style = 'cursor: wait';
    inter = setInterval(() => {loadbar();}, 10);
}, false);