package codenames

import (
	"encoding/json"
	"fmt"
	"html/template"
	"io/ioutil"
	"net/http"
	"os"
	"path"
	"sort"
	"strings"
	"sync"
	"time"

	"github.com/jbowens/assets"
	"github.com/jbowens/dictionary"
)

type Server struct {
	Server http.Server

	tpl    *template.Template
	jslib  assets.Bundle
	js     assets.Bundle
	css    assets.Bundle
	images assets.Bundle
	other  assets.Bundle

	gameIDWords []string

	mu         sync.Mutex
	games      map[string]*Game
	imagePaths []string
	mux        *http.ServeMux
}

func (s *Server) getGame(gameID, stateID string) (*Game, bool) {
	g, ok := s.games[gameID]
	if ok {
		return g, ok
	}
	state, ok := decodeGameState(stateID)
	if !ok {
		return nil, false
	}
	g = newGame(gameID, s.imagePaths, state)
	s.games[gameID] = g
	return g, true
}

func (s *Server) getImagePaths(rw http.ResponseWriter, imagesLink string) ([]string, error) {
	if imagesLink == "" {
		// No link was given, use the server's default images.
		return s.imagePaths, nil
	}

	fmt.Printf("Trying to use custom images from %s\n", imagesLink)
	rs, err := http.Get(imagesLink)
	if err != nil {
		http.Error(rw, "Problem with provided link", 400)
		return nil, err
	}
	defer rs.Body.Close()

	bodyBytes, err := ioutil.ReadAll(rs.Body)
	if err != nil {
		http.Error(rw, "Problem with provided link", 400)
		return nil, err
	}
	bodyString := string(bodyBytes)

	if strings.HasSuffix(imagesLink, "txt") {
		fmt.Printf("Text file based source\n")

		// We assume that the text file is links line by line.
		// They can either be full paths like:
		// https://server.com/image.jpg
		// Or paths relative to the text file location like:
		// image.jpg
		// Which refers to https://server.com/image.jpg
		// if the text file was for example here:
		// https://server.com/directorylisting.txt

		links := strings.Split(bodyString, "\n")
		validLinks := make([]string, 0, len(links))

		// Remove any zero-length links.
		for _, link := range links {
			if len(strings.TrimSpace(link)) > 0 {
				validLinks = append(validLinks, link)
			}
		}

		// Testing if the links are relative or absolute site links
		var absolute bool
		if strings.Contains(validLinks[0], "http") {
			absolute = true
		} else {
			absolute = false
		}

		if absolute {
			return validLinks, nil
		} else {
			splitted := strings.Split(imagesLink, "/")
			base := strings.Join(splitted[:len(splitted)-1], "/")
			for index, link := range validLinks {
				validLinks[index] = base + "/" + link
			}
			return validLinks, nil
		}
	} else {
		fmt.Printf("Directory based source\n")

		// The user has given us a non-text file.
		// We assume it's a directory listing, specifically the one nginx produces.

		splitted := strings.Split(imagesLink, "/")
		base := strings.Join(splitted[:len(splitted)-1], "/")
		lines := strings.Split(bodyString, "\n")
		var links []string
		for _, line := range lines {
			if !strings.Contains(line, "<a href=\"") {
				continue
			}
			relativeLink := strings.Split(strings.Split(" "+line, "<a href=\"")[1], "\">")[0]
			links = append(links, base+"/"+relativeLink)
		}
		return links, nil
	}
	// We should never get to here.
	return nil, nil
}

// GET /game/<id>
func (s *Server) handleRetrieveGame(rw http.ResponseWriter, req *http.Request) {
	s.mu.Lock()
	defer s.mu.Unlock()

	err := req.ParseForm()
	if err != nil {
		http.Error(rw, "Error decoding query string", 400)
		return
	}

	gameID := path.Base(req.URL.Path)
	g, ok := s.getGame(gameID, req.Form.Get("state_id"))
	if ok {
		writeGame(rw, g)
		return
	}

	imagePaths, err := s.getImagePaths(rw, req.Form.Get("newGameImagesLink"))
	if err != nil {
		fmt.Printf("Could not load in custom images\n")
		http.Error(rw, "Unknown error encountered with custom images", 400)
		return
	}

	if len(imagePaths) < 20 {
		fmt.Printf("Insufficient images in custom source\n")
		http.Error(rw, "Insufficient images (20 needed) available in custom source", 400)
		return
	}

	g = newGame(gameID, imagePaths, randomState())
	s.games[gameID] = g
	writeGame(rw, g)
}

// POST /guess
func (s *Server) handleGuess(rw http.ResponseWriter, req *http.Request) {
	var request struct {
		GameID  string `json:"game_id"`
		StateID string `json:"state_id"`
		Index   int    `json:"index"`
	}

	decoder := json.NewDecoder(req.Body)
	if err := decoder.Decode(&request); err != nil {
		http.Error(rw, "Error decoding", 400)
		return
	}

	s.mu.Lock()
	defer s.mu.Unlock()

	g, ok := s.getGame(request.GameID, request.StateID)
	if !ok {
		http.Error(rw, "No such game", 404)
		return
	}

	if err := g.Guess(request.Index); err != nil {
		http.Error(rw, err.Error(), 400)
		return
	}
	writeGame(rw, g)
}

// POST /end-turn
func (s *Server) handleEndTurn(rw http.ResponseWriter, req *http.Request) {
	var request struct {
		GameID  string `json:"game_id"`
		StateID string `json:"state_id"`
	}

	decoder := json.NewDecoder(req.Body)
	if err := decoder.Decode(&request); err != nil {
		http.Error(rw, "Error decoding", 400)
		return
	}

	s.mu.Lock()
	defer s.mu.Unlock()

	g, ok := s.getGame(request.GameID, request.StateID)
	if !ok {
		http.Error(rw, "No such game", 404)
		return
	}

	if err := g.NextTurn(); err != nil {
		http.Error(rw, err.Error(), 400)
		return
	}
	writeGame(rw, g)
}

func (s *Server) handleNextGame(rw http.ResponseWriter, req *http.Request) {
	var request struct {
		GameID string `json:"game_id"`
	}

	decoder := json.NewDecoder(req.Body)
	if err := decoder.Decode(&request); err != nil {
		http.Error(rw, "Error decoding", 400)
		return
	}

	s.mu.Lock()
	defer s.mu.Unlock()

	// Find the existing game so we can fetch the images it used.
	g, exists := s.games[request.GameID]

	if !exists {
		http.Error(rw, "Invalid game", 404)
		return
	}

	// Create a new game with the same ID and source images from the past game but with a random state.
	g = newGame(request.GameID, g.Images, randomState())
	s.games[request.GameID] = g
	writeGame(rw, g)
}

type statsResponse struct {
	InProgress int `json:"games_in_progress"`
}

func (s *Server) handleStats(rw http.ResponseWriter, req *http.Request) {
	var inProgress int

	s.mu.Lock()
	defer s.mu.Unlock()

	for _, g := range s.games {
		if g.WinningTeam == nil {
			inProgress++
		}
	}
	writeJSON(rw, statsResponse{inProgress})
}

func (s *Server) cleanupOldGames() {
	s.mu.Lock()
	defer s.mu.Unlock()
	for id, g := range s.games {
		if g.WinningTeam != nil && g.CreatedAt.Add(12*time.Hour).Before(time.Now()) {
			delete(s.games, id)
			fmt.Printf("Removed completed game %s\n", id)
			continue
		}
		if g.CreatedAt.Add(24 * time.Hour).Before(time.Now()) {
			delete(s.games, id)
			fmt.Printf("Removed expired game %s\n", id)
			continue
		}
	}
}

func (s *Server) Start() error {
	gameIDs, err := dictionary.Load("assets/game-id-words.txt")
	if err != nil {
		return err
	}

	var imagesAssetPath = "assets/images"
	s.images, err = assets.Development(imagesAssetPath)
	if err != nil {
		return err
	}
	// Hardcoding 20 is easier than defining a constants file.
	if len(s.images.RelativePaths()) < 20 {
		fmt.Fprintf(os.Stderr,
			"Error: You need at least %d images in %s\n",
			20,
			imagesAssetPath,
		)
		os.Exit(1)
	}

	s.tpl, err = template.New("index").Parse(tpl)
	if err != nil {
		return err
	}
	s.jslib, err = assets.Development("assets/jslib")
	if err != nil {
		return err
	}
	s.js, err = assets.Development("assets/javascript")
	if err != nil {
		return err
	}
	s.css, err = assets.Development("assets/stylesheets")
	if err != nil {
		return err
	}
	s.other, err = assets.Development("assets/other")
	if err != nil {
		return err
	}

	s.mux = http.NewServeMux()

	s.mux.HandleFunc("/stats", s.handleStats)
	s.mux.HandleFunc("/next-game", s.handleNextGame)
	s.mux.HandleFunc("/end-turn", s.handleEndTurn)
	s.mux.HandleFunc("/guess", s.handleGuess)
	s.mux.HandleFunc("/game/", s.handleRetrieveGame)

	s.mux.Handle("/js/lib/", http.StripPrefix("/js/lib/", s.jslib))
	s.mux.Handle("/js/", http.StripPrefix("/js/", s.js))
	s.mux.Handle("/css/", http.StripPrefix("/css/", s.css))
	s.mux.Handle("/images/", http.StripPrefix("/images/", s.images))
	s.mux.Handle("/other/", http.StripPrefix("/other/", s.other))
	s.mux.HandleFunc("/", s.handleIndex)

	gameIDs = dictionary.Filter(gameIDs, func(s string) bool { return len(s) > 3 })
	s.gameIDWords = gameIDs.Words()

	s.games = make(map[string]*Game)
	s.imagePaths = s.images.RelativePaths()
	for index, element := range s.imagePaths {
		s.imagePaths[index] = "images/" + element
	}
	sort.Strings(s.imagePaths)
	s.Server.Handler = s.mux

	go func() {
		for range time.Tick(10 * time.Minute) {
			s.cleanupOldGames()
		}
	}()
	fmt.Printf("Server running!\n")
	return s.Server.ListenAndServe()
}

func writeGame(rw http.ResponseWriter, g *Game) {
	writeJSON(rw, struct {
		*Game
		StateID string `json:"state_id"`
	}{g, g.GameState.ID()})
}

func writeJSON(rw http.ResponseWriter, resp interface{}) {
	j, err := json.Marshal(resp)
	if err != nil {
		http.Error(rw, "unable to marshal response: "+err.Error(), 500)
		return
	}

	rw.Header().Set("Content-Type", "application/json")
	rw.Write(j)
}
