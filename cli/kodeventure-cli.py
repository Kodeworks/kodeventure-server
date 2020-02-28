import argparse
import json
import random
import requests
import string

SERVER = 'http://localhost:3001'
TOKEN = 'dungeon-master-key'


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
    headers = {
        'Content-Type': 'application/json',
        'Authorization': TOKEN
    }

    response = requests.post(f'{SERVER}/user', headers=headers, json=payload)

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
    headers = {
        'Authorization': TOKEN
    }

    response = requests.get(f'{SERVER}/users', headers=headers)

    if response.status_code == 200:
        data = response.json()

        for player in data:
            print(player)
    else:
        print('ERROR:', response.text)


def start():
    pass


def pause():
    pass


def unpause():
    pass


def stop():
    pass


def cli(cmd):
    if cmd == 'adduser':
        adduser()
    elif cmd == 'listusers':
        listusers()
    else:
        pass


if __name__ == '__main__':
    parser = argparse.ArgumentParser(
        description='Kodeventure Server CLI'
    )

    parser.add_argument(
        'cmd',
        choices=['adduser', 'listusers', 'start', 'pause', 'unpause', 'stop'],
        help='Which command to run'
    )

    args = parser.parse_args()

    cli(args.cmd)

