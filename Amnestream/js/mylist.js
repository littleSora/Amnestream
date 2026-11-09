document.addEventListener('DOMContentLoaded', () => {
  const paintList = () => {
    const list = Store.list();
    $('#cnt').textContent = list.length ? `${list.length} saved title(s)` : 'Nothing saved yet';

    $('#list').innerHTML = list.length
      ? `<div class="grid">${list.map(m => `
          <div class="ml-item">
            <article class="card">
              <div class="card-media">
                <img src="${m.cover}" alt="">
                ${m.score ? `<span class="badge badge-score">&#9733; ${(m.score / 10).toFixed(1)}</span>` : ''}
                ${hitHTML(`anime.html?id=${m.id}`, savedTitle(m))}
                ${playBtnHTML(playTarget(m).href, playTarget(m).label)}
              </div>
              <a class="card-title" href="anime.html?id=${m.id}">${esc(savedTitle(m))}</a>
            </article>
            <button class="btn btn-ghost" style="margin-top:8px;width:100%" data-rm="${m.id}">Remove</button>
          </div>`).join('')}</div>`
      : `<p class="empty">Your list is empty. Add titles from any anime page.</p>`;

    $$('[data-rm]').forEach(b => b.onclick = () => {
      Store.setList(Store.list().filter(x => x.id !== +b.dataset.rm));
      paintList();
    });
  };
  paintList();

  let contSig = '';
  const paint = items => {
    const sig = items.map(x => `${x.id}:${x.ep}:${x.avail}:${x.fresh}:${x.cover}:${savedTitle(x)}`).join('|');
    if (sig === contSig) return;                       // Nothing the grid shows has changed
    contSig = sig;
    $('#cont').innerHTML = items.length
      ? `<div class="grid">${items.map(continueCardHTML).join('')}</div>`
      : `<p class="empty">Nothing in progress.</p>`;
    const fresh = items.filter(x => x.fresh).length;
    $('#cont-new').textContent = fresh ? `${fresh} with new episodes` : '';
  };
  Continue.bind(paint);                                // The same single function as the home row
  document.addEventListener('as:synced', paintList);
  Store.fillTitles().then(changed => {
    if (!changed) return;
    paintList(); Continue.refresh();
  });
});
