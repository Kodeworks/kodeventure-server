# Kodeventure Quests

Quest repository for the Kodeventure programming RPG

# Setup

#### Install MongoDB:

Via APT

```
sudo apt install mongodb
```

or use similar package manager on your host system

#### Install dependencies:

```
cd src
npm i
```

# Run

Start the server (from the `src` directory):

```
npm start
```

Create new server certificate (from the `cli` directory):

```
python3 kodeventure-cli.py cert
```

Stop the server again.

Start it with the new certificate (from the `src` directory):

```
npm start
```
