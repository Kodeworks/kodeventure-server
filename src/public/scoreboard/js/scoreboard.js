/**
 * Main Scoreboard component
 */
function Scoreboard() {
  const [players, setPlayers] = React.useState([])

  React.useEffect(() => {

    // Setup WS connection
    const ws = new WebSocket('ws://localhost:3001/scoreboard/ws')
    ws.onopen = handleConnected
    ws.onmessage = receiveMessage

    // TODO: Test data / to be removed
    setPlayers([
      { name: 'Foo', title: '', score: 10 },
      { name: 'Bar', title: '', score: 10  },
      { name: 'Baz', title: '', score: 10  }
    ])
  }, [])

  /**
   * Message receive handler
   * @param message The envelope from the server containing `type` and `data`
   */
  function receiveMessage(message) {
    const { type, data } = JSON.parse(message.data)

    switch (type) {
      case 'player_connected':
        setPlayers(players => [...players, data])
        break

      case 'player_score':
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
    e('div', { className: 'scoreboard-title' },
      e('div', { className: 'player-rank' }, 'Rank'),
      e('div', { className: 'player-name' }, 'Name'),
      e('div', { className: 'player-titles' }, 'Title'),
      e('div', { className: 'player-score' }, 'Score')
    ),
    players.map((player, index) => Player(player, index))
  )
}



