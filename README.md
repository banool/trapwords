# codenames

[![GoDoc](https://godoc.org/github.com/jbowens/codenames?status.svg)](https://godoc.org/github.com/jbowens/codenames)

Codenames implements a web app for generating and displaying boards for the <a href="https://en.wikipedia.org/wiki/Codenames_(board_game)">Codenames</a> board game. Generated boards are shareable and will update as words are revealed. The board can be viewed either as a spymaster or an ordinary player.

A hosted version of the app is available at [www.horsepaste.com](https://www.horsepaste.com).

![Spymaster view of board](https://raw.githubusercontent.com/jbowens/codenames/master/screenshot.png)

## How to run this yourself
Firstly, make sure you have go installed. There are good resources for this [on](https://ahmadawais.com/install-go-lang-on-macos-with-homebrew/) [the](https://www.digitalocean.com/community/tutorials/how-to-install-go-on-ubuntu-18-04) [net](https://www.reddit.com/r/golang/comments/79nnq2/go_development_using_wsl_in_win_10/). 

```
cd $GOPATH
go get github.com/banool/codenames/...
cd src/github.com/banool/codenames
# To build the server code.
go build github.com/banool/codenames/...
# To build the binary.
go build github.com/banool/codenames/cmd/...
./codenames
```

You can optionally specify a port (the default is 9001):
```
./codenames 8000
```

