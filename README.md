# Kodeventure Server

Server application for the Kodeventure programming RPG

# Setup

#### Update quest submodule

```
git submodule update --init
```

#### Install MongoDB:

Via APT

```
sudo apt install mongodb
```

or use similar package manager on your host system

#### Install dependencies:

```
cd src
npm i -g typescript ts-node ts-node-dev
npm i
```

If npm fails to install because of permissions you probably needs to configure the npm prefix since npm don't have permission to install packages into the default directory. We recommend to set the prefix instead of using `sudo`. I.e. create a folder in your home directory, or other directories with write permission: `~/.npm-global`. And set it as the prefix: `npm config set prefix '~/.npm-global/'`.

After doing this, all `npm -g install` will install global packages into `~/.npm-global`.

You can also set `~/.npm-global/bin` in your `$PATH`.

# Configure

Create a new admin token in `src/config.ts`

Set hostname and port in `src/config.ts`

#### Certificate

Start the server (from the `src` directory):

```
npm start
```

Create new server certificate (from the `cli` directory):

```
python3 kodeventure-cli.py cert
```

Stop the server again.

# Run

Start the server (from the `src` directory):

```
npm start
```
