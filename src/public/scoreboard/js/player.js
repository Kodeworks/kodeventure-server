/**
 * Player component
 */
function Player(player, index) {

  return e('div', { key: `player-${index}`, className: 'player' },
    e('div', { className: 'player-rank' }, (index + 1)),
    e('div', { className: 'player-name' }, player.name),
    e('div', { className: 'player-titles' }, player.titles.join(', ')),
    e('div', { className: 'player-score' }, player.score)
  )
}
