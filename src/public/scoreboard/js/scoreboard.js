
//-----------------------------------------------------------------------------
// TODO: Test data - to be removed
//-----------------------------------------------------------------------------
const _players = [
  { name: 'Foo', title: '', score: 10 },
  { name: 'Bar', title: '', score: 10  },
  { name: 'Baz', title: '', score: 10  }
]

const _killfeed = [
  '(test msg) Welcome back mr. Foo',
  '(test msg) mr. Foo elimiated mr. Bar with a straw hat'
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
    const ws = new WebSocket('wss://localhost:3001/scoreboard/ws')
    ws.onopen = handleConnected
    ws.onmessage = receiveMessage

    // TODO: Setup testdata - to be removed
    setPlayers(_players)
    setKillFeed(_killfeed)
  }, [])


  /**
   * Adds message to event feed. Ensure feed only contains 15 messages.
   * @param {string} newMessage
   */
  function updateKillFeed(newMessage) {
    setKillFeed(killFeed => {
      return [...killFeed.slice(0, 14), newMessage]
    })
  }


  /**
   * Add player to scoreboard. Checks of player exists by name (for now) before appending new player.
   * @param {Player} player
   */
  function addPlayer(player) {
    setPlayers(players => {
      const playerExists = players.findIndex(({ name }) => name === player.name)

      if (playerExists > -1) {
        // Update player score if score is changed
        if (players[playerExists].score !== player.score) {
          players[playerExists].score = player.score
          return [...players]
        }

        // Return same list // do nothing if not
        return players
      }

      return [...players, player]
    })
  }


  /**
   * Updates scoreboard on player_score event by sorting the players by score
   */
  function updateScoreBoard() {

    // Sort by highest score
    setPlayers(players => {
      players.sort((a, b) => b.score - a.score)
      return [...players]
    })
  }



  function updatePlayerTitles(player) {

  }


  /**
   * Message receive handler
   * @param message The envelope from the server containing `type` and `data`
   */
  function receiveMessage(message) {
    const { type, data } = JSON.parse(message.data)

    switch (type) {
      case 'player_connected':
        updateKillFeed(`${data.player.name} just connected!`)
        addPlayer(data.player)
        break

      case 'player_reconnected':
        // Do nothing on payer reconnect
        break

      case 'player_score':
        addPlayer(data.player)
        updateScoreBoard()
        break

      case 'player_title':
        updatePlayerTitles(data.player)
        updateKillFeed(`${data.player.name} gained title: ${data.title}`)

        break

      case 'player_loot_obtained':
        updateKillFeed(`${data.player.name} optained ${data.loot}`)
        break

      case 'player_loot_used':
        updateKillFeed(`${data.player.name} used ${data.loot}`)
        break

      default:
        console.warn('Unknown event')
    }
  }


  /**
   * Scoreboard connected handler
   */
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

