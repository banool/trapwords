
class ImageLinkStatusComponent extends React.Component {
    render() {
        if (this.props.good == null) {
            return <p className="message"></p>;
        }
        if (this.props.good == true) {
            return <p className="message good">That's it, let's go!</p>;
        }
        if (this.props.good == false) {
            return <p className="message bad">There was something wrong with your image link :( Try again?</p>;
        }
    }
};
    

window.Lobby = React.createClass({
    propTypes: {
        gameSelected:   React.PropTypes.func,
        defaultGameID: React.PropTypes.string,
    },

    getInitialState: function() {
        return {
            newGameName: this.props.defaultGameID,
            selectedGame: null,
            newGameImagesLinkGood: null,
        };
    },

    newGameTextChange: function(e) {
        this.setState({newGameName: e.target.value});
    },

    newGameImagesLinkChange: function(e) {
        this.setState({newGameImagesLink: e.target.value});
    },

    handleNewGame: function(e) {
        e.preventDefault();
        if (!this.state.newGameName) {
            return;
        }

        // This double post thing is janky but it works. The second
        // post request hooks into the game we made with the first
        // post call using the custom images link.
        $.post(
            '/game/'+this.state.newGameName,
            {"newGameImagesLink": this.state.newGameImagesLink},
        ).done(function(resp) {
            console.log(resp);
            this.setState({newGameImagesLinkGood: true});
            $.post('/game/'+this.state.newGameName, this.joinGame);
            this.setState({newGameName: ''});
            this.setState({newGameImagesLink: ''});
        }.bind(this)).fail(function(resp) {
            this.setState({newGameImagesLinkGood: false}); 
        }.bind(this));
    },

    joinGame: function(g) {
        this.setState({selectedGame: g});
        if (this.props.gameSelected) {
            this.props.gameSelected(g);
        }
    },

    render: function() {
        return (
            <div id="lobby">
                <div id="available-games">
                    <form id="new-game">
                        <p className="intro">
                           Play Codenames Pictures online across multiple devices on a shared board.
                           To create a new game or join an existing
                           game, enter a game identifier and click 'GO'.
                        </p>
                        <input type="text" id="game-name" autoFocus
                            onChange={this.newGameTextChange} value={this.state.newGameName} />
                        <button onClick={this.handleNewGame}>Go</button>
                        <p className ="intro">
                            You can use your own images using the field below. See <a href="https://github.com/banool/codenames-pictures#loading-up-images">the GitHub readme</a> for information about valid link options.
                        </p>
                        <input className="full" type="text" id="user-images" placeholder="Link to text file or folder of images..."
                            onChange={this.newGameImagesLinkChange} value={this.state.newGameImagesLink} />
                    </form>
                    <p>If you're joining a game that already exists, this field will be ignored. Have fun!!!</p>
                    <ImageLinkStatusComponent good={this.state.newGameImagesLinkGood} />
                </div>
            </div>
        );
    }
});
