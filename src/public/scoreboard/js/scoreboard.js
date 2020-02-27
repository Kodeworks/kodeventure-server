
//-----------------------------------------------------------------------------
// TODO: Test data - to be removed
//-----------------------------------------------------------------------------
const _players = [
  { name: 'Foo', title: '', score: 10 },
  { name: 'Bar', title: '', score: 10  },
  { name: 'Baz', title: '', score: 10  }
]

const _killfeed = [
  'Welcome back Suprtri',
  'Suprtri elimiated myth with a straw hat',
  'Suprtri elimiated sudoole with a straw hat',
  'myth just rejoined the battle',
  'sudoole is now spectating myth',
  'myth received a golden straw hat',
  'Level up! sudoole is now level 151',
  'Welcome new player, flyrev',
  'Suprtri eliminated flyrev with a straw hat'
]
//-----------------------------------------------------------------------------



/**
 * Main Scoreboard component
 */
function Scoreboard() {
  const [players, setPlayers] = React.useState([])
  const [killFeed, setKillFeed] = React.useState([])

  React.useEffect(() => {
    // Setup WS connection
    const ws = new WebSocket('ws://localhost:3001/scoreboard/ws')
    ws.onopen = handleConnected
    ws.onmessage = receiveMessage

    // TODO: Setup testdata - to be removed
    setPlayers(_players)
    setKillFeed(_killfeed)
  }, [])

  /**
   * Message receive handler
   * @param message The envelope from the server containing `type` and `data`
   */
  function receiveMessage(message) {
    const { type, data } = JSON.parse(message.data)

    switch (type) {
      case 'player_connected':
        setPlayers(players => [...players, data.player])
        break

      case 'player_score':
        //...
        break

      case 'player_title':
        //...
        break

      case 'player_loot_obtained':
        //...
        break

      case 'player_loot_used':
        //...
        break

      default:
        console.warn('Unknown event')
    }
  }

  function handleConnected() {
    console.info('Im connected!')
  }

  return e(React.Fragment, null,
    KillFeed(killFeed),
    PlayerList(players)
  )
}

/**
 * Renders the player list
 * @param {Player[]} players A list of players
 */
function PlayerList(players) {
  return e('div', { className: 'player-list' },
    e('div', { className: 'scoreboard-title' },
      e('div', { className: 'player-rank' }, 'Rank'),
      e('div', { className: 'player-name' }, 'Name'),
      e('div', { className: 'player-titles' }, 'Title'),
      e('div', { className: 'player-score' }, 'Score')
    ),
    players.map((player, index) => Player(player, index))
  )
}


/**
 * Renders the kill feed
 * @param {string[]} feed A list of messages for the feed
 */
function KillFeed(feed) {

  return e('div', { className: 'kill-feed' },
    e('h2', { className: 'kill-feed-header' }, 'Last events'),
    e('ul', { className: 'kill-feed-list' }, feed.map((msg, index) => e('li', null, msg)))
  )
}

