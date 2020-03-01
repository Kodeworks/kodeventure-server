import argparse
import json
import random
import requests
import string

SERVER = 'http://localhost:3001'
TOKEN = 'dungeon-master-key'
HEADERS = {
    'Authorization': TOKEN,
    'Content-Type': 'application/json'
}


def adduser():
    # 0.00001368 % chance of collision should suffice for 20 players
    player_token = ''.join(random.choice(string.ascii_letters) for i in range(4))
    server_token = ''.join(random.choice(string.ascii_letters) for i in range(4))

    payload = {
        "token": player_token,
        "server_token": server_token,
        "name": input('Player name: '),
        "score": 0,
        "titles": [],
        "loot": []
    }

    response = requests.post(f'{SERVER}/user', headers=HEADERS, json=payload)

    if response.status_code == 200:
        data = response.json()
        if 'errors' in data:
            print('ERROR:', data['errors'])
        else:
            print('Player token:', payload['token'])
            print('Server token:', payload['server_token'])
    else:
        print('ERROR:', response.text)

def listusers():
    response = requests.get(f'{SERVER}/users', headers=HEADERS)

    if response.status_code == 200:
        data = response.json()

        for player in data:
            print(player)
    else:
        print('ERROR:', response.text)


def start():
    response = requests.post(f'{SERVER}/game/start', headers=HEADERS)

    if response.status_code == 200:
        print('Game started!')
    else:
        print('ERROR:', response.text)


def pause():
    response = requests.post(f'{SERVER}/game/pause', headers=HEADERS)

    if response.status_code == 200:
        print('Game paused!')
    else:
        print('ERROR:', response.text)


def unpause():
    response = requests.post(f'{SERVER}/game/pause', headers=HEADERS)

    if response.status_code == 200:
        print('Game unpaused!')
    else:
        print('ERROR:', response.text)


def stop():
    response = requests.post(f'{SERVER}/game/stop', headers=HEADERS)

    if response.status_code == 200:
        print('Game ended!')


if __name__ == '__main__':
    parser = argparse.ArgumentParser(
        description='Kodeventure Server CLI'
    )

    cmds = {
        'adduser': adduser,
        'listusers': listusers,
        'start': start,
        'pause': pause,
        'stop': stop,
    }

    parser.add_argument(
        'cmd',
        choices=cmds,
        help='Which command to run'
    )

    args = parser.parse_args()

    cmds[args.cmd]()

