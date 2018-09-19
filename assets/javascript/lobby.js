window.Lobby = React.createClass({
    propTypes: {
        gameSelected:   React.PropTypes.func,
        defaultGameID: React.PropTypes.string,
    },

    getInitialState: function() {
        return {
            newGameName: this.props.defaultGameID,
            selectedGame: null,
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

        $.post(
            '/game/'+this.state.newGameName,
            {"newGameImagesLink": this.state.newGameImagesLink}
        );
        $.post('/game/'+this.state.newGameName, this.joinGame);
        this.setState({newGameName: ''});
        this.setState({newGameImagesLink: ''});
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
                            You can use your own images using the field below. Valid options:
                            <ul>
                                <li>Link to a folder of images.</li>
                                <li>Link to a text file with URLs for individual images, one per line.</li>
                            </ul>
                        </p>
                        <input className="full" type="text" id="user-images" placeholder="Link to folder of images or text file..."
                            onChange={this.newGameImagesLinkChange} value={this.state.newGameImagesLink} />
                            <p>If you're joining a game that already exists, this field will be ignored. Have fun!!!</p>
                    </form>
                </div>
            </div>
        );
    }
});
