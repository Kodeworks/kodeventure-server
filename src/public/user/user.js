const playerName = document.getElementById('playerName')
const registerButton = document.getElementById('register-button')
const userDeleteButton = document.getElementById('user-delete')

function disableUI() {
  playerName.setAttribute('disabled', 'disabled')
  registerButton.setAttribute('disabled', 'disabled')
}

function enableUI() {
  playerName.removeAttribute('disabled')
  registerButton.removeAttribute('disabled')
}

function getUUID() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8)
    return v.toString(16)
  })
}

function renderUserData() {
  const kodeventureUser = localStorage.getItem('kodeventure_user')

  if (kodeventureUser) {
    disableUI()
    const player = JSON.parse(kodeventureUser)

    document.querySelector('.user-registration-data').setAttribute('style', 'display: block;')

    const userName = document.getElementById('user-name')
    const userToken = document.getElementById('user-token')
    const userServerToken = document.getElementById('user-server-token')


    userName.innerText = player.name
    userToken.innerText = player.token
    userServerToken.innerText = player.server_token

  }
}

function resetUserData() {
  const kodeventureUser = localStorage.getItem('kodeventure_user')

  if (kodeventureUser) {
    if (confirm('U sure u wanna delete your player data?')) {
      localStorage.removeItem('kodeventure_user')
      playerName.value = ''
      location.reload()
    }
  }
}

registerButton.addEventListener('click', function (event) {
  const playerToken = getUUID()
  const serverToken = getUUID()

  const user = {
    name: playerName.value,
    token: playerToken,
    server_token: serverToken
  }

  fetch('/user', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(user)
  }).then(res => res.json()).then(data => {
    if (data.errmsg) {
      document.querySelector('.user-registration--username-error').setAttribute('style', 'display: block;')
      return
    }

    document.querySelector('.user-registration--username-error').removeAttribute('style')
    localStorage.setItem('kodeventure_user', JSON.stringify(data))
    renderUserData()
  })
})

userDeleteButton.addEventListener('click', function (event) {
  resetUserData()
})

renderUserData()
