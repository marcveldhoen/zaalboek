-- Zaalboek testen: het programmaatje achter Spotlight › "Zaalboek testen".
--
-- 1. Controleert of Claude Code (het programma `claude`) is aangemeld. Zo
--    niet, dan opent het Terminal met `claude auth login`: jij keurt de
--    aanmelding goed in de browser, daarna gaat het vanzelf verder.
-- 2. Start de testserver in Terminal, als die nog niet draait.
-- 3. Opent de testpagina in Safari.
--
-- Stoppen: Ctrl+C in het Terminal-venster van de testserver.
--
-- Opnieuw maken na een wijziging (in Terminal, vanuit de projectmap):
--   osacompile -o ~/Applications/"Zaalboek testen.app" gereedschap/zaalboek-testen.applescript

property adres : "http://localhost:8745/test-lokaal.html"
property zoekpad : "PATH=$HOME/.local/bin:/opt/homebrew/bin:/usr/local/bin:$PATH; "
property aanmeldtest : "claude auth status 2>/dev/null | grep -q '\"loggedIn\": true'"

on draait()
	set code to do shell script "curl -s -o /dev/null -w '%{http_code}' " & quoted form of adres & " || true"
	return code is "200"
end draait

on aangemeld()
	set antwoord to do shell script zoekpad & aanmeldtest & " && echo ja || echo nee"
	return antwoord is "ja"
end aangemeld

set moetAanmelden to not aangemeld()

if not draait() then
	-- eerst (zo nodig) aanmelden, dan de server, in één Terminal-venster
	set opdracht to zoekpad & "cd ~/Documents/zaalboek && "
	if moetAanmelden then set opdracht to opdracht & "{ " & aanmeldtest & " || { echo 'Claude Code is niet aangemeld. Keur de aanmelding goed in de browser.'; claude auth login; }; } && "
	set opdracht to opdracht & "node gereedschap/testserver.js"
	tell application "Terminal"
		activate
		do script opdracht
	end tell
	-- wachten tot de server draait (aanmelden kan even duren: tot 5 minuten)
	repeat 600 times
		delay 0.5
		if draait() then exit repeat
	end repeat
else if moetAanmelden then
	-- de server draait al; alleen aanmelden
	tell application "Terminal"
		activate
		do script zoekpad & "echo 'Claude Code is niet aangemeld. Keur de aanmelding goed in de browser.'; claude auth login"
	end tell
end if

do shell script "open -a Safari " & quoted form of adres
