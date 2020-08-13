var Service;
var Characteristic;
const fetch = require("node-fetch");

var sys = require('sys');
    exec = require('child_process').exec;
    assign = require('object-assign');
    fileExists = require('file-exists');
    chokidar = require('chokidar');

module.exports = function(homebridge) {
  Service = homebridge.hap.Service;
  Characteristic = homebridge.hap.Characteristic;
  homebridge.registerAccessory('homebridge-script2', 'Script2', script2Accessory);
}

function puts(error, stdout, stderr) {
   console.log(stdout)
}

function script2Accessory(log, config) {
  this.log = log;
  this.service = 'Switch';
  this.name = config['name'];
  this.onCommand = config['on'];
  this.offCommand = config['off'];
  this.type = config['type'];
  this.brand = config['brand'];
  if(typeof config['brand'] !== "undefined") {
    this.ip = config['brand'];
  } else {
    this.ip = false;
  }
  this.stateCommand = config['state'] || false;
  this.onValue = config['on_value'] || "true";
  this.fileState = config['fileState'] || false;
  if (!this.fileState) {
    this.onValue = this.onValue.trim().toLowerCase();
  }
  //this.exactMatch = config['exact_match'] || true;
  this.enabledServices = [];
  if(this.type=="tv") {
    this.ip = config['ip'];
    this.tvService = new Service.Television(this.name, 'tvService');

    this.tvService
        .setCharacteristic(Characteristic.ConfiguredName, this.name);

    this.tvService
        .setCharacteristic(Characteristic.SleepDiscoveryMode, Characteristic.SleepDiscoveryMode.ALWAYS_DISCOVERABLE);


    this.tvService
        .getCharacteristic(Characteristic.Active)
        .on('get', this.getState.bind(this))
        .on('set', this.setState.bind(this));

    this.tvService
        .getCharacteristic(Characteristic.RemoteKey)
        .on('set', this.remoteKeyPress.bind(this));


    this.enabledServices.push(this.tvService);


    this.tvSpeakerService = new Service.TelevisionSpeaker(this.name + ' Volume', 'tvSpeakerService');

    this.tvSpeakerService
        .setCharacteristic(Characteristic.Active, Characteristic.Active.ACTIVE)
        .setCharacteristic(Characteristic.VolumeControlType, Characteristic.VolumeControlType.ABSOLUTE);

    this.tvSpeakerService
        .getCharacteristic(Characteristic.VolumeSelector)
        .on('set', (state, callback) => {
            this.setVolumeSwitch(state, callback, !state);
        });

    // this.tvSpeakerService
    //     .getCharacteristic(Characteristic.Mute)
    //     .on('get', this.getMuteState.bind(this))
    //     .on('set', this.setMuteState.bind(this));

    // this.tvSpeakerService
    //     .addCharacteristic(Characteristic.Volume)
    //     .on('get', this.getVolume.bind(this))
    //     .on('set', this.setVolume.bind(this));

    this.tvService.addLinkedService(this.tvSpeakerService);
    this.enabledServices.push(this.tvSpeakerService);

  }
}

script2Accessory.prototype.setVolumeSwitch = function(state, callback, isUp) {
      if (isUp) {
          if(this.brand=="appleTV3") {
            callback();
          } else {
            this.tvCommand(callback,'KEY_VOLUP');
          }
      } else {
          if(this.brand=="appleTV3") {
            callback();
          } else {
            this.tvCommand(callback,'KEY_VOLDOWN');
          }
      }
};

script2Accessory.prototype.tvCommand = function(callback,command) {
  var keyevents = {
      'KEY_VOLDOWN':'KEY_VOLDOWN',
      'KEY_VOLUP':'KEY_VOLUP',
      'REWIND':'REWIND',
      'FASTFORWARD':'FASTFORWARD',
      'KEY_UP':'KEY_UP',
      'KEY_DOWN':'KEY_DOWN',
      'KEY_LEFT':'KEY_LEFT',
      'KEY_RIGHT':'KEY_RIGHT',
      'KEY_ENTER':'KEY_ENTER',
      'KEY_EXIT':'KEY_EXIT',
      'KEY_MENU':'KEY_MENU',
      'KEY_PLAY':'KEY_PLAY',
      'KEY_PAUSE':'KEY_PAUSE',
      'KEY_INFO':'KEY_INFO'
  }
  if(this.brand=="philipsTV") {
    keyevents = {
      'KEY_VOLDOWN':'VolumeDown',
      'KEY_VOLUP':'VolumeUp',
      'REWIND':'Rewind',
      'FASTFORWARD':'FastForward',
      'KEY_UP':'CursorUp',
      'KEY_DOWN':'CursorDown',
      'KEY_LEFT':'CursorLeft',
      'KEY_RIGHT':'CursorRight',
      'KEY_ENTER':'Confirm',
      'KEY_EXIT':'Back',
      'KEY_MENU':'Back',
      'KEY_PLAY':'Play',
      'KEY_PAUSE':'Pause',
      'KEY_INFO':'Home'
    }
    request = fetch("http://"+this.ip+":1925/1/input/key", {
      body: '{"key": "'+ keyevents[command] +'"}',
      headers: {
    	"accept": "application/json",
    	"Content-Type": "text/plain; charset=utf-8"
      },
      method: "POST"
    });
    callback(); 
  } else if(this.brand=="fireTV") {
    keyevents = {
      'KEY_VOLDOWN':'KEYCODE_VOLUME_DOWN',
      'KEY_VOLUP':'KEYCODE_VOLUME_UP',
      'REWIND':'KEYCODE_MEDIA_REWIND',
      'FASTFORWARD':'KEYCODE_MEDIA_FAST_FORWARD',
      'KEY_UP':'KEYCODE_DPAD_UP',
      'KEY_DOWN':'KEYCODE_DPAD_DOWN',
      'KEY_LEFT':'KEYCODE_DPAD_LEFT',
      'KEY_RIGHT':'KEYCODE_DPAD_RIGHT',
      'KEY_ENTER':'KEYCODE_ENTER',
      'KEY_EXIT':'KEYCODE_BACK',
      'KEY_MENU':'KEYCODE_HOME',
      'KEY_PLAY':'KEYCODE_MEDIA_PLAY_PAUSE',
      'KEY_PAUSE':'KEYCODE_MEDIA_PLAY_PAUSE',
      'KEY_INFO':'KEYCODE_POWER'
    }
    exec("adb shell \"input keyevent "+keyevents[command]+"\"", function (error, stdout, stderr) {
    });
    callback(); 
  } else if(this.brand=="appleTV3") {
    keyevents = {
      'KEY_VOLDOWN':'KEY_VOLDOWN',
      'KEY_VOLUP':'KEY_VOLUP',
      'REWIND':'REWIND',
      'FASTFORWARD':'FASTFORWARD',
      'KEY_UP':'up',
      'KEY_DOWN':'down',
      'KEY_LEFT':'left',
      'KEY_RIGHT':'right',
      'KEY_ENTER':'select',
      'KEY_EXIT':'menu',
      'KEY_MENU':'top_menu',
      'KEY_PLAY':'play',
      'KEY_PAUSE':'pause',
      'KEY_INFO':'wake_up'
    }
    exec("atvremote --address "+this.ip+" -a "+keyevents[command], function (error, stdout, stderr) {
      callback(); 
    });
  } else {
    exec("samsungctl --host "+this.ip+" key "+keyevents[command]+" --name raspberry --id raspy;", function (error, stdout, stderr) {
      callback(); 
    });
  }
}
script2Accessory.prototype.remoteKeyPress = function(remoteKey, callback) {

    this.log.debug('webOS - remote key pressed: %d', remoteKey);

    switch (remoteKey) {
        case Characteristic.RemoteKey.REWIND:
            this.tvCommand(callback,'REWIND');
            break;
        case Characteristic.RemoteKey.FAST_FORWARD:
            this.tvCommand(callback,'FASTFORWARD');
            break;
        case Characteristic.RemoteKey.NEXT_TRACK:
            // does a endpoint call exist?
            this.log.info('webOS - next track remote key not supported');
            callback();
            break;
        case Characteristic.RemoteKey.PREVIOUS_TRACK:
            // does a endpoint call exist?
            this.log.info('webOS - previous track remote key not supported');
            callback();
            break;
        case Characteristic.RemoteKey.ARROW_UP:
            this.tvCommand(callback,'KEY_UP');
            break;
        case Characteristic.RemoteKey.ARROW_DOWN:
            this.tvCommand(callback,'KEY_DOWN');
            break;
        case Characteristic.RemoteKey.ARROW_LEFT:
            this.tvCommand(callback,'KEY_LEFT');
            break;
        case Characteristic.RemoteKey.ARROW_RIGHT:
            this.tvCommand(callback,'KEY_RIGHT');
            break;
        case Characteristic.RemoteKey.SELECT:
            this.tvCommand(callback,'KEY_ENTER');
            break;
        case Characteristic.RemoteKey.BACK:
            this.tvCommand(callback,'KEY_EXIT');
            break;
        case Characteristic.RemoteKey.EXIT:
            this.tvCommand(callback,'KEY_MENU');
            break;
            break;
        case Characteristic.RemoteKey.PLAY_PAUSE:
            if (this.isPaused) {
              this.tvCommand(callback,'KEY_PLAY');
            } else {
              this.tvCommand(callback,'KEY_PAUSE');
            }
            this.isPaused = !this.isPaused;
            break;
        case Characteristic.RemoteKey.INFORMATION:
              this.tvCommand(callback,'KEY_INFO');
            break;
    }

};

/* 
  script2Accessory.prototype.matchesString = function(match) {
  if(this.exactMatch) {
    return (match === this.onValue);
  }
  else {
    return (match.indexOf(this.onValue) > -1);
  }
}
*/

script2Accessory.prototype.setState = function(powerOn, callback) {
  var accessory = this;
  var state = powerOn ? 'on' : 'off';
  var prop = state + 'Command';
  var command = accessory[prop];

    accessory.currentState = powerOn;
    callback(null);
    exec(command, puts);
    accessory.log('Set ' + accessory.name + ' to ' + state);
}

script2Accessory.prototype.getState = function(callback) {
  var accessory = this;
  var command = accessory['stateCommand'];
  var stdout = "none";  
  
  if (this.fileState) {
    var flagFile = fileExists.sync(this.fileState);
    accessory.log('State of ' + accessory.name + ' is: ' + flagFile);
    callback(null, flagFile);
  }
  else if (this.stateCommand) {
    exec(command, function (error, stdout, stderr) {
      var cleanOut=stdout.trim().toLowerCase();
      accessory.log('State of ' + accessory.name + ' is: ' + cleanOut);
      callback(null, cleanOut == accessory.onValue);
    });
  }
  else {
      accessory.log('Must set config value for fileState or state.');
  }
}

script2Accessory.prototype.getServices = function() {
  var informationService = new Service.AccessoryInformation();
  var switchService = new Service.Switch(this.name);

  informationService
  .setCharacteristic(Characteristic.Manufacturer, 'script2 Manufacturer')
  .setCharacteristic(Characteristic.Model, 'script2 Model')
  .setCharacteristic(Characteristic.SerialNumber, 'script2 Serial Number');

  var characteristic = switchService.getCharacteristic(Characteristic.On)
  .on('set', this.setState.bind(this));

  if (this.stateCommand || this.fileState) {
    characteristic.on('get', this.getState.bind(this))
  };
  
  if (this.fileState) {
    var fileCreatedHandler = function(path, stats){
      if (!this.currentState) {
          this.log('File ' + path + ' was created');
	      switchService.setCharacteristic(Characteristic.On, true);
      }
    }.bind(this);
  
    var fileRemovedHandler = function(path, stats){
      if (this.currentState) {
          this.log('File ' + path + ' was deleted');
	      switchService.setCharacteristic(Characteristic.On, false);
	  }
    }.bind(this);
  
    var watcher = chokidar.watch(this.fileState, {alwaysStat: true});
    watcher.on('add', fileCreatedHandler);
    watcher.on('unlink', fileRemovedHandler);
  }
  if(this.type=="tv") {
    return this.enabledServices;
  }
  return [switchService];
}
