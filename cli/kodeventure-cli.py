import argparse
import json
import os
import random
import requests
import string
import urllib3


SERVER = 'https://localhost:3001'
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

    response = requests.post(f'{SERVER}/user', headers=HEADERS, json=payload, verify=False)

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
    response = requests.get(f'{SERVER}/users', headers=HEADERS, verify=False)

    if response.status_code == 200:
        data = response.json()

        for player in data:
            print(player)
    else:
        print('ERROR:', response.text)


def cert():
    response = requests.post(f'{SERVER}/cert', verify=False)

    if response.status_code == 200:
        data = response.json()

        private_key = data['private']
        public_key = data['public']
        certificate = data['cert']

        def parent_dir(filename):
            return os.path.join(os.path.dirname(__file__), '..', filename)

        with open(parent_dir('server.key'), 'w', encoding='utf-8') as f:
            f.write(private_key)
            print('Wrote server.key')
        with open(parent_dir('server.pub'), 'w', encoding='utf-8') as f:
            f.write(public_key)
            print('Wrote server.pub')
        with open(parent_dir('server.crt'), 'w', encoding='utf-8') as f:
            f.write(certificate)
            print('Wrote server.crt')
    else:
        print('ERROR:', response.text)


def start():
    response = requests.post(f'{SERVER}/game/start', headers=HEADERS, verify=False)

    if response.status_code == 200:
        print('Game started!')
    else:
        print('ERROR:', response.text)


def pause():
    response = requests.post(f'{SERVER}/game/pause', headers=HEADERS, verify=False)

    if response.status_code == 200:
        print('Game paused!')
    else:
        print('ERROR:', response.text)


def unpause():
    response = requests.post(f'{SERVER}/game/unpause', headers=HEADERS, verify=False)

    if response.status_code == 200:
        print('Game unpaused!')
    else:
        print('ERROR:', response.text)


def stop():
    response = requests.post(f'{SERVER}/game/stop', headers=HEADERS, verify=False)

    if response.status_code == 200:
        print('Game ended!')
    else:
        print('ERROR:', response.text)


if __name__ == '__main__':
    parser = argparse.ArgumentParser(
        description='Kodeventure Server CLI'
    )

    cmds = {
        'adduser': adduser,
        'listusers': listusers,
        'cert': cert,
        'start': start,
        'pause': pause,
        'unpause': unpause,
        'stop': stop,
    }

    parser.add_argument(
        'cmd',
        choices=cmds,
        help='Which command to run'
    )

    args = parser.parse_args()

    urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)

    cmds[args.cmd]()

