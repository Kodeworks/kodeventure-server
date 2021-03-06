/**
 * Main Scoreboard component
 */
function Scoreboard() {
  const [players, setPlayers] = React.useState([])
  const [killFeed, setKillFeed] = React.useState([])

  React.useEffect(() => {
    // Setup WS connection
    const ws = new WebSocket(`wss://${location.host}/scoreboard/ws`)
    ws.onopen = handleConnected
    ws.onmessage = receiveMessage
    ws.onclose = handleDisconnected
  }, [])


  /**
   * Adds message to event feed. Ensure feed only contains 15 messages.
   * @param {string} newMessage
   */
  function updateKillFeed(newMessage, options) {
    options = options || {};

    const message = e('span', { className: `message-type--${options.type}`}, newMessage)

    setKillFeed(killFeed => {
      return [message, ...killFeed.slice(0, 14)]
    })
  }


  /**
   * Add player to scoreboard. Checks of player exists by name (for now) before appending new player.
   * @param {Player} player
   */
  function updatePlayerList(player) {
    setPlayers(players => {
      const playerIndex = players.findIndex(({ name }) => name === player.name)

      if (playerIndex > -1) {
        // Update player score if score is changed
        if (players[playerIndex].score !== player.score) {
          players[playerIndex].score = player.score
        }
      } else {
        // Push new player onto list
        player.titles = player.titles.slice(0, 4)
        players.push(player)
      }

      // Sort player list by score before updating the players list
      players.sort((a, b) => b.score - a.score)
      return [...players]
    })
  }



  /**
   * Append new title to player object
   * @param {Player} player The player object
   * @param {string} title Newly received title
   */
  function updatePlayerTitles(player, title) {
    setPlayers(players => {
      const playerIndex = players.findIndex(({ name }) => name === player.name)

      if (playerIndex > -1) {
        players[playerIndex].titles = [...players[playerIndex].titles.slice(0, 3), title]
        return [...players]
      }

      return players
    })
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
        updatePlayerList(data.player)
        break

      case 'player_score':
        updatePlayerList(data.player)
        break

      case 'player_title':
        updateKillFeed(`${data.player.name} gained title: ${data.title}`)
        updatePlayerTitles(data.player, data.title)
        break

      case 'player_loot_obtained':
        updateKillFeed(`${data.player.name} obtained: ${data.loot}`)
        break

      case 'player_loot_used':
        updateKillFeed(`${data.player.name} used ${data.loot}`)
        break

      case 'player_quest_completed':
        updateKillFeed(`${data.player.name} has completed ${data.player.completedQuests} quests`, { type: 'playerQuestCompleted' })
        break

      case 'game_started':
        updateKillFeed(`Game started!`, { type: 'gameStarted' })
        break

      case 'game_paused':
        updateKillFeed(`Game paused`, { type: 'gamePaused' })
        break

      case 'game_unpaused':
        updateKillFeed(`Game unpaused`, { type: 'gameUnpaused' })
        break

      case 'game_ended':
        updateKillFeed(`Game ended:(`, { type: 'gameEnded' })
        break

      default: console.warn('Unknown event')
    }
  }


  /**
   * Scoreboard connected handler
   */
  function handleConnected() {
    updateKillFeed(`Connected to the hall of fame!`, { type: 'scoreboardConnected' })
  }

  /**
   * Scoreboard disconnect handler
   */
  function handleDisconnected() {
    updateKillFeed(`Disconnected from the hall of fame :(`, { type: `gameEnded` })
  }


  return e(React.Fragment, null,
    e('div', { className: '' }, KillFeed(killFeed), PlayerCount(players.length)),

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
      e('div', { className: 'player-titles' }, 'Titles'),
      e('div', { className: 'player-score' }, 'Score')
    ),
    players.slice(0, 50).map((player, index) => Player(player, index))
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

/**
 * Renders the player count
 * @param {Number} playerCount Number of players currenltly registered in the game
 */
function PlayerCount(playerCount) {
  return e('div', { className: 'playerCount' }, `Total players: ${playerCount}`)
}

