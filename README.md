![Logo](admin/enigma2.png)

# ioBroker enigma2

- Adapter for ioBroker to retrieve information from an enigma2 receiver and send commands
- (Adapter only runs on one host! with a client installation there's currently still problems.)

- (DE) Adapter für ioBroker um Informationen von einem enigma2 Receiver abzufragen und Befehle zu senden
- (DE)(Adapter läuft nur auf einem Host! bei einer Client Installation gib's aktuell noch probleme.)


## Installation:
Installation requires nodejs v8 at minimum

## Forum
[![ioBroker](https://forum.iobroker.net/assets/uploads/system/site-logo.png)](https://forum.iobroker.net/topic/25112/enigma2-adapter-ab-v1-2-3)

----
### Funktionen
- BOX_IP
- NETWORK
- CHANNEL_SERVICEREFERENCE
- CHANNEL_SERVICEREFERENCE_NAME
- CHANNEL
- EVENTDESCRIPTION
- EVENTDURATION
- EVENTDURATION_MIN
- EVENTREMAINING
- EVENTREMAINING_MIN
- EVENT_PROGRESS_PERCENT
- EVENT_TIME_START
- EVENT_TIME_END
- EVENT_TIME_PASSED
- HDD_CAPACITY
- HDD_FREE
- MESSAGE_ANSWER
- MODEL
- MUTED
- PROGRAMM
- PROGRAMM_INFO
- PROGRAMM_AFTER
- PROGRAMM_AFTER_INFO
- STANDBY
- VOLUME
- WEB_IF_VERSION
- isRecording
- Timer_is_set
- MOVIE_LIST (only openwebif)
- TIMER_LIST
- CHANNEL_PICON (Picon path - only openwebif)

----
### main
- enigma2-CONNECTION

----
### Command
- command.CHANNEL_DOWN
- command.CHANNEL_UP
- command.DOWN
- command.UP
- command.EPG
- command.EXIT
- command.LEFT
- command.MENU
- command.MUTE_TOGGLE
- command.OK
- command.PAUSE
- command.PLAY
- command.RADIO
- command.REC
- command.REMOTE-CONTROL
- command.RIGHT
- command.SET_VOLUME
- command.STANDBY_TOGGLE
- command.STOP
- command.TV
- command.UP
- command.ZAP = send an invalid servicereference

----
### Main Command
- main_command.DEEP_STANDBY         = Deepstandby
- main_command.REBOOT               = Reboot
- main_command.RESTART_GUI          = Restart Enigma2 (GUI)
- main_command.STANDBY              = Standby
- main_command.WAKEUP_FROM_STANDBY  = Wakeup form Standby

----
### Message
 - Message.Text           = Text of Message (Enter -> Send)
 - Message.Type           = Number from 0 to 3 (0= Yes/No ; 1= Info ; 2=Message ; 3=Attention)
 - Message.Timeout        = timeout of Message in sec. Can be empty or the Number of seconds the Message should disappear after.


----
### Alexa_Command
 - Alexa_Command.Mute     = Alexa Command
 - Alexa_Command.Standby  = Alexa Command
 
---- 
 ### sendTo 
#### (in Blockly)
 - message   = Text of Message
 - msgType   = Number from 0 to 3 (0= Yes/No ; 1= Info ; 2=Message ; 3=Attention)
 - timeout   = timeout of Message in sec. Can be empty or the Number of seconds the Message should disappear after.
 
![Bild Text](admin/enigma2_message2.png)
### oder
![Bild Text](admin/enigma2_message.png)

[> zum Blockly Import <](admin/Blockly_Import.md)
 
#### (in java)
```
sendTo("enigma2.0", "send", {
   "message": 'Test Nachricht', /* Text of Message */
   "timeout": 26,               /* timeout of Message in sec. (Can be empty or the Number of seconds the Message should disappear after.) */
   "msgType": 1                 /* Number from 0 to 3 (0= Yes/No ; 1= Info ; 2=Message ; 3=Attention) */
});
```

----
 
## Changelog

### 1.3.1 (2020-04-16)
* (devel6236)       movieList.sort() & deviceinfo_interval() & movielist_interval() removed in main.js
* (devel6236)       //enigma2.Update: query DEVICEINFO_HDD

### 1.3.0 (2020-02-08)
* (Matten-Matten)       add: `connectionType` and `dataSource` in `io-package.json`
* (Matten-Matten)       bugfix: in `.enigma2.CHANNEL_PICON`

### 1.2.9 (2019-12-10)
* (Scrounger)           bugfix: Movielist generates high load [#33](https://github.com/Matten-Matten/ioBroker.enigma2/issues/33)
* (Matten-Matten)       bugfix: Blockly [#31](https://github.com/Matten-Matten/ioBroker.enigma2/issues/31)

### 1.2.8 (2019-11-30)
* (Matten-Matten)       add: `.enigma2.CHANNEL_PICON` (Picon path - only openwebif)
* (Matten-Matten)       add: Select / Deselect Timer List in the Adapter Config mask
* (Matten-Matten)       add: Select / Deselect Movie List in the Adapter Config mask
* (Matten-Matten)       add: new Logo

### 1.2.7 (2019-11-30)
* (Matten-Matten)       correction in (Blockly Block) to sending Messages

### 1.2.6 (2019-11-29)
* (Matten-Matten)       add: `sendTo` (Blockly) to sending Messages
* (Scrounger)           add: `.enigma2.MOVIE_LIST`

### 1.2.5 (2019-11-17)
* (Scrounger)           add: `.enigma2.Timer_list` [#25](https://github.com/Matten-Matten/ioBroker.enigma2/issues/25) (Merge pull request [#28](https://github.com/Matten-Matten/ioBroker.enigma2/issues/28))

### 1.2.4 (2019-10-20)
* (Matten-Matten)       add: `.enigma2.Timer_is_set` ([#23](https://github.com/Matten-Matten/ioBroker.enigma2/issues/23))

### 1.2.3 (2019-09-15)
* (Matten-Matten)       authentication correction in `.enigma2.isRecording` check
* (Matten-Matten)       correction in `.enigma2.isRecording` check after shutdown

### 1.2.2 (2019-09-05)
* (Matten-Matten)       correction in `.enigma2.isRecording` check

### 1.2.1 (2019-08-07)
* (Matten-Matten)       add: `.enigma2.isRecording` ([#12](https://github.com/Matten-Matten/ioBroker.enigma2/issues/12))

### 1.2.0 (2019-05-14)
* (Matten-Matten)      ([#17](https://github.com/Matten-Matten/ioBroker.enigma2/issues/17)) `.Alexa_Command.Mute` & `.Alexa_Command.Standby` now with status feedback
* (Matten-Matten)       add: `.enigma2.EVENT_TIME_PASSED`

### 1.1.9 (2019-02-04)
* (Matten-Matten)      (#14) add enigma2.EVENTDURATION_MIN in Minute
* (Matten-Matten)      (#14) add enigma2.EVENTREMAINING_MIN in Minute
* (Matten-Matten)      Troubleshooting in standby toggle
* (Matten-Matten)      Troubleshooting in the "eventlist" query

### 1.1.8 (2019-01-10)
* (Matten-Matten)      enigma2.EVENTDURATION decoded in H:M:S
* (Matten-Matten)      enigma2.EVENTREMAINING decoded in H:M:S

### 1.1.7 (2019-01-09)
* (Matten-Matten)      enigma2.EVENT_PROGRESS_PERCENT
* (Matten-Matten)      enigma2.EVENT_TIME_START
* (Matten-Matten)      enigma2.EVENT_TIME_END

### 1.1.6 (2018-11-18)
* (Matten-Matten)      command.ZAP (send an invalid servicereference)

### 1.1.5 (2018-11-17)
* (Matten-Matten)      add Alexa_command

### 1.1.4 (2018-11-16)
* (Matten-Matten)      add main_command

### 1.1.3 (2018-11-15)
* (Matten-Matten)      remove Timer

### 1.1.2 (2018-11-01)
* (Matten-Matten)      Bug Fix

### 1.1.1 (2018-10-26)
* (NightWatcher)      CodeCleaning

### 1.1.0 (2018-10-26)
* (Matten-Matten)      add Timer, max 8 Timer
* (Matten-Matten)      add manually updating Timer states
* (Matten-Matten)      optimizations 
* (Matten-Matten)      auto Check HDD (max.2 HDD)
* (Matten-Matten)      add manually updating Enigma2 states
* (Matten-Matten)      read the device information only at the adapter start
* (Matten-Matten)      fixed hard disk (HDD) update Time every 30 sec.

### 1.0.0 (2018-10-23)
* (Matten-Matten)      add command.REMOTE-CONTROL
* (Matten-Matten)      Message optimized
* (Matten-Matten)      Command-Button integrated (no extra script needed!)


### 0.4.3 (2018-10-21)
* (Matten-Matten)      Nicht bestätigte Werte und zustände (rot angezeigt) angepasst
* (Matten-Matten)      Message um ein Objekt erweitert "ANSWER_IS"
* (Matten-Matten)      Button BUTTON SCRIPT auf V3.4 angepasst
                       

### 0.4.2 (2018-10-05)
* (Matten-Matten)      Button Probleme bei Dreamwebif angepasst
* (Matten-Matten)      Button BUTTON SCRIPT auf V3.1 angepasst


### 0.4.1 (2018-09-21)
* (Matten-Matten)      Button werden gelöscht wenn in der Config "BUTTON SCRIPT" deaktiviert wird
* (Matten-Matten)      Alexa (Mute,Standby)


### 0.3.3 (2018-09-20)
* (Matten-Matten)      Message senden hinzugefügt
* (Matten-Matten)      Message answer (true/false) hinzugefügt
* (Matten-Matten)      Message.Question_Activ hinzugefügt


### 0.3.0 (2018-08-19)
* (Matten-Matten)      enigma2-CONNECTION hinzugefügt
* (Matten-Matten)      Update Configurationsmaske
* (Matten-Matten)      Update ENIGMA 2 BUTTON SCRIPT V2.0 (nur noch manuell die Adapter Instanz im Script festlegen)

### 0.2.3 (2018-08-17)
* (Matten-Matten)      Admin V3.51

### 0.2.2 (2018-05-12)
* (Matten-Matten)      Button hinzugefügt

### 0.2.1 (2018-03-22)
* (Matten-Matten)      Fehlerbehebung in der HDD Abfrage

### 0.2.0 (2018-03-22)
* (Matten-Matten)      keine Fehlermeldung mehr wenn Box in DeepStandby
* (Matten-Matten)      Erweiterung (PROGRAMM_AFTER ; PROGRAMM_AFTER_INFO ; WEB_IF_VERSION ; NETWORK) hinzugefügt

### 0.1.0 (2018-03-21)
* (Matten-Matten)      installierbar

### 0.0.11 (2018-03-19)
* (Matten-Matten)                  Adapterkonfigurationsmaske (für Admin3) überarbeitet
* (wendy2702 & Matten-Matten)      Admin3 

### 0.0.10 (2018-03-19)
* (Matten-Matten)  Umstellungsversuch Admin3

### 0.0.9 (2018-02-07)
* (Matten-Matten)  Kategorie geändert
* (Matten-Matten)  Abfrage Werte sind nur noch lesbar nicht mehr beschreibbar.

### 0.0.8 (2017-11-25)
* (Matten-Matten)  Fehlerbehebung in HDD Abfrage
* (Matten-Matten)  Fehlerbehebung wenn Box Heruntergefahren (nicht erreichbar)
                    jetzt nur noch mit: info	received error: connect ECONNREFUSED 192.168. ...
* (Matten-Matten)  Konfigurations-Maske vereinfacht 

### 0.0.7 (2017-09-20)
* (Matten-Matten) add Fehlerbehebung in der MUTED Abfrage

### 0.0.6 (2017-09-19)
* (Matten-Matten) add Erweiterung der Adapterkonfiguration

### 0.0.5 (2017-09-18)
* (Matten-Matten) add grafische Optimierung der Adapterkonfiguration

----
## License
MIT License

Copyright (c) 2020 Matten-Matten 

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
