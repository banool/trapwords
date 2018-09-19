window.App = React.createClass({
    getInitialState: function() {
        if (document.location.hash) {
            return {gameID: document.location.hash.slice(1)};
        }
        if (window.selectedGameID) {
            return {gameID: window.selectedGameID}
        }
        return {gameID: null};
    },

    gameSelected: function(game) {
        // this.setState({gameID: game.id});
        document.location.pathname = '/' + game.id;
    },

    render: function() {
        let pane;
        if (this.state.gameID) {
            pane = (<window.Game gameID={this.state.gameID} />)
        } else {
            pane = (<window.Lobby gameSelected={this.gameSelected} defaultGameID={window.autogeneratedGameID} />)
        }

        return (
            <div id="application">
                <div id="topbar">
                    <a href={"https://" + window.location.host}>
                        <h1>Codenames Pictures</h1>
                    </a>
                </div>
                {pane}
            </div>
        );
    }
});
