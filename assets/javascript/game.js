var settingToggles = [
    {name: 'Color-blind mode', setting: 'colorBlind', defaultValue: false},
    {name: 'Expand on mouse-over', setting: 'expandOnMouseOver', defaultValue: false},
    {name: 'Stretch images to fit square', setting: 'fitImagesToDiv', defaultValue: true},
]

class StatusComponent extends React.Component {
    render() {
        // Trapwords selection phase.
        if (this.props.phase == "trapwords") {
            return <p>Both teams are thinking of Trapwords 🤔🤔🤔</p>;
        }
        if (this.props.phase == "blue") {
            if (this.props.guessing) {
                return <p>Blue team's Cluegiver is trying to get their team to guess their word!</p>;
            } else {
                return <p>Blue team's Cluegiver is about to try to get their team to guess their word</p>;
            }
        }
        if (this.props.phase == "red") {
            if (this.props.guessing) {
                return <p>Red team's Cluegiver is trying to get their team to guess their word!</p>;
            } else {
                return <p>Red team's Cluegiver is about to try to get their team to guess their word</p>;
            }
        }
    }
};

class WordComponent extends React.Component {
    // Required props: team, blueWord, redWord, phase, cluegiver, guessing
    render() {
        if (this.props.team == null) {
            return <p>Choose a team!</p>;
        }
        if (this.props.phase == "trapwords") {
            if (this.props.team == "blue") {
                return <div>Blue team, you are thinking of trapwords for <h2>{this.props.blueWord}</h2></div>;
            }
            if (this.props.team == "red") {
                return <div>Red team, you are thinking of trapwords for <h2>{this.props.redWord}</h2></div>;
            }
        }
        if (this.props.phase == "blue") {
            if (this.props.team == "blue") {
                if (this.props.cluegiver) {
                    return <div>Blue team Cluegiver, try to get your team to guess the word <h2>{this.props.redWord}</h2>Careful for Trapwords!</div>;
                } else {
                    if (this.props.guessing) {
                        return <div>Blue team, try to guess your Cluegiver's word!</div>;
                    } else {
                        return <div>Blue team, get ready to guess your Cluegiver's word!</div>;
                    }
                }
            }
            if (this.props.team == "red") {
                return <div>Red team, the Blue Cluegiver is trying to make their team guess the word <h2>{this.props.redWord}</h2>Listen out for your trapwords!</div>;
            }
        }
        if (this.props.phase == "red") {
            if (this.props.team == "red") {
                if (this.props.cluegiver) {
                    return <div>Red team Cluegiver, try to get your team to guess the word <h2>{this.props.blueWord}</h2>Careful for Trapwords!</div>;
                } else {
                    if (this.props.guessing) {
                        return <div>Red team, try to guess your Cluegiver's word!</div>;
                    } else {
                        return <div>Red team, get ready to guess your Cluegiver's word!</div>;
                    }
                }
            }
            if (this.props.team == "blue") {
                return <div>Blue team, the Red Cluegiver is trying to make their team guess the word <h2>{this.props.blueWord}</h2>Listen out for your trapwords!</div>;
            }
        }
    }
};

class TimerComponent extends React.Component {
    // Required props: end, guessing
    render() {
        if (!this.props.guessing) {
            return<p>Timer will appear here</p>;
        }
        var seconds = new Date().getTime() / 1000;
        if (seconds > this.props.end) {
            return <p>Out of time!</p>;
        }
        var remaining = this.props.end - seconds;
        return <p>{remaining.toFixed(0)} seconds remaining!</p>
    }

    tick() {
      this.setState(prevState => ({
        seconds: prevState.seconds + 1
      }));
    }

    componentDidMount() {
      this.interval = setInterval(() => this.tick(), 1000);
    }

    componentWillUnmount() {
      clearInterval(this.interval);
    }
};

window.Game = React.createClass({
    propTypes: {
        gameID: React.PropTypes.string,
    },

    getDefaultSettings: function() {
        var settings = {};
        settingToggles.forEach(function(s) {
	    settings[s.setting] = s.defaultValue;
        });
        console.log(settings);
        return settings;
    },

    getInitialSettings: function() {
        try {
            var settings = localStorage.getItem('settings');
            return JSON.parse(settings) || this.getDefaultSettings();
        } catch(e) {
            return this.getDefaultSettings();
        }
    },

    saveSettings: function(settings) {
        this.setState({settings});
        try {
            localStorage.setItem('settings', JSON.stringify(settings));
        } catch(e) {}
    },

    getInitialState: function() {
        return {
            game: null,
            mounted: true,
            settings: this.getInitialSettings(),
            mode: 'game',
            team: null,
            cluegiver: false,
            guessing: false,
        };
    },

    extraClasses: function() {
        var classes = '';
        if (this.state.settings.colorBlind) classes += ' color-blind';
        return classes;
    },

    handleKeyDown: function(e) {
        if (e.keyCode == 27) this.setState({mode: 'game'});
    },

    componentWillMount: function() {
        window.addEventListener("keydown", this.handleKeyDown.bind(this));
        this.refresh();
    },

    componentWillUnmount: function() {
        window.removeEventListener("keydown", this.handleKeyDown.bind(this));
        this.setState({mounted: false});
    },

    refresh: function() {
        if (!this.state.mounted) {
            return;
        }

        var refreshURL = '/game/' + this.props.gameID;
        if (this.state.game && this.state.game.state_id) {
            refreshURL = refreshURL + "?state_id=" + this.state.game.state_id;
        }

        $.get(refreshURL, (data) => {
            if (this.state.game && data.created_at != this.state.game.created_at) {
                this.setState({team: null});
            }
            this.setState({game: data});
        });
        setTimeout(this.refresh, 3000);
    },

    setRole: function(e, role) {
        e.preventDefault();
        this.setState({team: role});
    },

    currentPhase: function() {
        // The server will allow the round to only ever be 0 to 9.
        let round = this.state.game.round;
        // Trapwords selection phase.
        if (round == 0) { return "trapwords"; }
        // The blue team cluegiver is about to give clues for their word.
        if (round == 1) { return "blue"; }
        // The blue team cluegiver gives clues for their word.
        if (round == 2) { return "blue"; }
        // The red team cluegiver is about to give clues for their word.
        if (round == 3) { return "red"; }
        // The red team cluegiver gives clues for their word.
        if (round == 4) { return "red"; }
        // Trapwords selection phase.
        if (round == 5) { return "trapwords"; }
        // The red team cluegiver gives clues for their word first this time.
        if (round == 6) { return "red"; }
        if (round == 7) { return "red"; }
        // Now the blue team cluegiver gives clues for their word.
        if (round == 8) { return "blue"; }
        if (round == 9) { return "blue"; }
    },

    guessing: function() {
        let round = this.state.game.round;
        if (round == 2 || round == 4 || round == 7 || round == 9) {
            return true;
        }
        return false;
    },

    nextPhase: function() {
        let r = this.state.game.round;
        if (r == 1 || r == 3 || r == 6 || r == 8) {
            this.setState({cluegiver: true});
        }
        if (r == 0 || r == 5) {
            this.setState({cluegiver: false});
        }
        $.post('/end-turn', JSON.stringify({
            game_id: this.state.game.id,
            state_id: this.state.game.state_id,
        }), (g) => { this.setState({game: g}); });
    },

    trapwordsChosen: function() {
        $.post('/trapwords-chosen', JSON.stringify({
            game_id: this.state.game.id,
            state_id: this.state.game.state_id,
        }), (g) => { this.setState({game: g}); });
    },

    nextGame: function(e) {
        e.preventDefault();
        $.post('/next-game', JSON.stringify({game_id: this.state.game.id}),
              (g) => { this.setState({game: g, cluegiver: false}) });
    },

    toggleSettings: function(e) {
        if (e != null) e.preventDefault();
        if (this.state.mode == 'settings') {
            this.setState({mode: 'game'});
        } else {
            this.setState({mode: 'settings'});
        }
    },

    toggleSetting: function(e, setting) {
        if (e != null) e.preventDefault();
        var settings = {...this.state.settings};
        if (settings[setting]) settings[setting] = false;
        else settings[setting] = true;
        this.saveSettings(settings);
    },

    render: function() {
        if (!this.state.game) {
            return (<p className="loading">Loading&hellip;</p>);
        }

        if (this.state.mode == 'settings') {
            return (
                <div className="settings">
                    <div onClick={(e) => this.toggleSettings(e)} className="close-settings">
                        <svg width="32" height="32" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path d="M0 0L30 30M30 0L0 30" transform="translate(1 1)" stroke="black" stroke-width="2"/>
                        </svg>
                    </div>
                    <div className="settings-content">
                        <h2>SETTINGS</h2>
                        <div className="toggles">
                            {settingToggles.map((toggle) => (
                            <div className="toggle-set">
                                <div className="settings-label">
                                    {toggle.name} <span className={'toggle-state'}>{this.state.settings[toggle.setting] ? 'ON' : 'OFF'}</span>
                                </div>
                                <div onClick={(e) => this.toggleSetting(e, toggle.setting)} className={this.state.settings[toggle.setting] ? 'toggle active' : 'toggle inactive'}>
                                    <div className="switch"></div>
                                </div>
                            </div>
                            ))}
                        </div>
                    </div>
                </div>
            );
        }

        let nextPhaseButtonText;
        if (this.currentPhase() == "trapwords") {
            nextPhaseButtonText = "Click when both teams have chosen trapwords";
        }
        if (this.currentPhase() == "blue") {
            if (!this.guessing()) {
                nextPhaseButtonText = "Blue team Cluegiver, click here when you're ready";
            } else {
                nextPhaseButtonText = "Blue team, click here when you're done";
            }
        }
        if (this.currentPhase() == "red") {
            if (!this.guessing()) {
                nextPhaseButtonText = "Red team Cluegiver, click here when you're ready";
            } else {
                nextPhaseButtonText = "Red team, click here when you're done";
            }
        }
        var nextPhaseButton = (<button onClick={(e) => this.nextPhase(e)} id="end-turn-btn">{nextPhaseButtonText}</button>)

        let otherTeam = 'blue';
        if (this.state.game.starting_team == 'blue') {
            otherTeam = 'red';
        }

        return (
            <div id="game-view" className={(this.state.cluegiver ? "cluegiver" : "player") + this.extraClasses()}>
                <div id="share">
                  Send this link to friends: <a className="url" href={window.location.href}>{window.location.href}</a>
                </div>
                <div id="status-line" className={this.currentPhase()}>
                    <div id="status" className="status-text">
                        <StatusComponent phase={this.currentPhase()} guessing={this.guessing()}/>
                    </div>
                </div>
                <div id="button-line">
                    <div id="remaining"><TimerComponent guessing={this.guessing()} end={this.state.game.guessEnd}/></div>
                    {nextPhaseButton}
                    <div className="clear"></div>
                </div>
                <div className="board">
                  <WordComponent
                      team={this.state.team}
                      blueWord={this.state.game.words[0]}
                      redWord={this.state.game.words[1]}
                      phase={this.currentPhase()}
                      cluegiver={this.state.cluegiver}
                      guessing={this.guessing()}
                  />
                </div>
                <form id="mode-toggle" className={this.state.cluegiver ? "cluegiver-selected" : "player-selected"}>
		    <a href="https://github.com/banool/trapwords"><svg width="30" height="30" aria-labelledby="simpleicons-github-icon" role="img" viewBox="0 0 30 30" xmlns="http://www.w3.org/2000/svg"><title id="simpleicons-github-icon">GitHub icon</title><path d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12"/></svg></a>
                    <button onClick={(e) => this.toggleSettings(e)} className="gear">
                      <svg width="30" height="30" viewBox="0 0 35 35" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M22.3344 4.86447L24.31 8.23766C21.9171 9.80387 21.1402 12.9586 22.5981 15.4479C23.038 16.1989 23.6332 16.8067 24.3204 17.2543L22.2714 20.7527C20.6682 19.9354 18.6888 19.9151 17.0088 20.8712C15.3443 21.8185 14.3731 23.4973 14.2734 25.2596H10.3693C10.3241 24.4368 10.087 23.612 9.64099 22.8504C8.16283 20.3266 4.93593 19.4239 2.34593 20.7661L0.342913 17.3461C2.85907 15.8175 3.70246 12.5796 2.21287 10.0362C1.74415 9.23595 1.09909 8.59835 0.354399 8.14386L2.34677 4.74208C3.95677 5.5788 5.95446 5.60726 7.64791 4.64346C9.31398 3.69524 10.2854 2.0141 10.3836 0.25H14.267C14.2917 1.11932 14.5297 1.99505 15.0012 2.80013C16.4866 5.33635 19.738 6.23549 22.3344 4.86447ZM15.0038 17.3703C17.6265 15.8776 18.5279 12.5685 17.0114 9.97937C15.4963 7.39236 12.1437 6.50866 9.52304 8.00013C6.90036 9.4928 5.99896 12.8019 7.5154 15.391C9.03058 17.978 12.3832 18.8617 15.0038 17.3703Z" transform="translate(12.7548) rotate(30)" fill="#EEE" stroke="#BBB" stroke-width="0.5"/>
                      </svg>
                    </button>
                    <button onClick={(e) => this.setRole(e, 'blue')} className="blue">Blue Team</button>
                    <button onClick={(e) => this.setRole(e, 'red')} className="red">Red Team</button>
                    <button onClick={(e) => this.nextGame(e)} id="next-game-btn">Next game</button>
                </form>
            </div>
        );
    }
});
