// https://github.com/mixxxdj/mixxx/wiki/Midi-Scripting
// http://midi.teragonaudio.com/tech/midispec/ctllist.htm#:~:text=A%20Controller%20message%20has%20a,ie%2C%200%20to%20127).
function doNothing() {}

var AutoController = {};

// status byte (opcode + channel), controller number, controller value
// XML file matches on status and controller number - bytes 1 and 2

AutoController.init = init;
AutoController.shutdown = doNothing;

// shift status from incoming to outgoing
function shiftStatus(val) {
    return val + 32;
}

const masterStatus = 0xb0;
const deckOneStatus = 0xb1;
const deckTwoStatus = 0xb2;
const libraryStatus = 0xb3;

const deckStatus = function(deckNumber) {
    return (deckNumber == 1) ? deckOneStatus : deckTwoStatus;
}

/* ---------------------------------------------- 

These controls are separated on their controller number, to allow for manipulation of VPT parameters

*/

const moveVerticalController = 0;

const loopToggleController = 4;
const loopSizeController = 5;
const jumpSizeController = 6;
const jumpForwardController = 7;
const jumpBackwardController = 8;

const pflController = 10;
const loadTrackController = 11;

const scratchController = 33;
const jogController = 34;

const masterGainController = 39;
const preGainController = 40;
const crossfaderController = 42;
const volumeController = 45;
const rateController = 46;

const beatController = 64;

const hotcueOneController = 65;
const hotcueTwoController = 66;
const hotcueThreeController = 67;
const hotcueFourController = 68;
const keylockController = 69;

const hiEQController = 70;
const midEQController = 71;
const loEQController = 72;
const filterController = 73;

const fxMixController = 74;
const metaOneController = 75;
const metaTwoController = 76;
const metaThreeController = 77;

const playController = 80;
const scratchEnabledController = 81;
const syncController = 82;
const cueController = 83;

const _masterString = "[Master]";
const _libraryString = "[Library]";

// empty callback
function nothing(x) {return x;}

function _mapBrowseInverse(val) { return val === 127 ? -1 : 1; }

function _mapLoopSizeInverse(val) { return (Math.log(val) / Math.log(2)) + 5; }

function _mapLoopSize(val) { return Math.pow(2, val - 5); }

function _mapMove(val) { return scrollPosition - val; }

// positive values scratch forward, negative values scratch back
function _mapScratch(val) { return val - 64; }

// the value from the jog control represents playback speed and direction
// we only need direction! 
function _mapScratchInverse(val) { return script.absoluteLinInverse(val, -3, 3); }

function _mapNonStandardInverse(val) { return script.absoluteLinInverse(val, -1, 1); }

function _mapNonStandard(val) { return script.absoluteLin(val, -1, 1); }

function _mapStandardInverse(val) { return script.absoluteLinInverse(val, 0, 1); }

function _mapStandard(val) { return script.absoluteLin(val, 0, 1); }

function _mapKnobInverse(val) { return script.absoluteNonLinInverse(val, 0, 1, 4); }

function _mapKnob(val) { return script.absoluteNonLin(val, 0, 1, 4); }

/* ----------------------------------------------------------- */

function _channelString(number) { return "[Channel" + number.toString() + "]"; }

function _channelNumber(channelString) { return (parseInt(channelString.substring(8, 9)) - 1); }

function _fxMixString(deck) { return "[EffectRack1_EffectUnit" + deck.toString() + "]"; }

function _fxString(deck, fxNum) {
    return "[EffectRack1_EffectUnit" + deck.toString() + "_Effect" + fxNum.toString() + "]";
}
function _deckFromFxString(fxString) { return fxString.substring(23, 24); }

function _eqString(deck) { return "[EqualizerRack1_" + _channelString(deck) + "_Effect1]"; }

function _deckFromEqString(eqString) { return eqString.substring(24, 25); }

function _filterString(deck) { return "[QuickEffectRack1_" + _channelString(deck) + "]"; }

function _deckFromFilterString(eqString) { return eqString.substring(26, 27); }

function _beatloopToggleString(number) { return "beatloop_" + number.toString() + "_toggle"; }

function _hotcueString(number) { return "hotcue_" + number + "_activate"; }

function _hotcueFromString(cueString) { return parseInt(cueString.substring(7, 8)); }

function _fxNumString(fxString) { return fxString.substring(4, 5);}

function _metaString(fxString) { return fxString.substring(0, 4); }

/* ----------------------------------------------------------- */

function setChannelCallback(controller, control, remap) {
    var callback = function(value, group, control) {
        midi.sendShortMsg(deckStatus(script.deckFromGroup(group)), controller, remap(value));
    }

    var connectionA = engine.makeConnection(_channelString(1), control, callback);
    var connectionB = engine.makeConnection(_channelString(2), control, callback);
}

function setBeatCallback(controller, control, remap) {
    var beatCallback = function (value, group, control) {
        const deckNumber = script.deckFromGroup(group);
        const position = engine.getParameter(group, 'playposition');
        // if playhead is within 50ms of beat, send beat
        if (value === 1) {
            midi.sendShortMsg(deckStatus(deckNumber), controller, remap(position));
        }
    }

    var connectionA = engine.makeConnection(_channelString(1), 'beat_active', beatCallback);
    var connectionB = engine.makeConnection(_channelString(2), 'beat_active', beatCallback);
}

function setEQCallback(controller, control, remap) {
    var EQCallback = function(value, group, control) {
        midi.sendShortMsg(deckStatus(_deckFromEqString(group)), controller, remap(value));
    }

    var EQConnectionA = engine.makeConnection(_eqString(1), control, EQCallback);
    var EQConnectionB = engine.makeConnection(_eqString(2), control, EQCallback);
}

function setFilterCallback(controller, control, remap) {
    var filterCallback = function(value, group, control) {
        midi.sendShortMsg(deckStatus(_deckFromFilterString(group)), controller, remap(value));
    }

    var filterConnectionA = engine.makeConnection(_filterString(1), control, filterCallback);
    var filterConnectionB = engine.makeConnection(_filterString(2), control, filterCallback);
}

function setFxMixCallback(controller, control, remap) {
    var fxMixCallback = function(value, group, control) {
        midi.sendShortMsg(deckStatus(_deckFromFxString(group)), controller, remap(value));
    }
    
    var fxConnectionA = engine.makeConnection(_fxMixString(1), control, fxMixCallback);
    var fxConnectionB = engine.makeConnection(_fxMixString(2), control, fxMixCallback);
}

function setFxCallback(controller, control, remap) {
    var fxCallback = function(value, group, control) {
        midi.sendShortMsg(deckStatus(_deckFromFxString(group)), controller, remap(value));
    }
    const fxString1 = _fxString(1, _fxNumString(control));
    const fxString2 = _fxString(2, _fxNumString(control));
    
    var fxConnectionA = engine.makeConnection(fxString1, _metaString(control), fxCallback);
    var fxConnectionB = engine.makeConnection(fxString2, _metaString(control), fxCallback);
}

function setHotcueCallback(controller, control) {
    var hotcueCallback = function(value, group, control) {
        midi.sendShortMsg(deckStatus(script.deckFromGroup(group)), controller, 1);
    }
    var cueConnectionA = engine.makeConnection(_channelString(1), control, hotcueCallback);
    var cueConnectionB = engine.makeConnection(_channelString(2), control, hotcueCallback);
}

function setJogCallback(control, remap) {
    var wheelCallback = function(value, group, control) {
        const deckNumber = script.deckFromGroup(group);
        const scratching = engine.isScratching(deckNumber);
        // note - scratching only happens if there's a loaded track
        const wheelController = scratching ? scratchController : jogController;
        midi.sendShortMsg(deckStatus(script.deckFromGroup(group)), wheelController, remap(value));
    }
    var wheelConnectionA = engine.makeConnection(_channelString(1), control, wheelCallback);
    var wheelConnectionB = engine.makeConnection(_channelString(2), control, wheelCallback);
}

function setLibraryCallback(controller, control, remap) {
    var libraryCallback = function(value, group, control) {
        midi.sendShortMsg(libraryStatus, controller, remap(value));
    }
    var libraryConnection = engine.makeConnection(_libraryString, control, libraryCallback);
}

function setMasterCallback(controller, control, remap) {
    var masterCallback = function(value, group, control) {
        midi.sendShortMsg(masterStatus, controller, remap(value));
    }
    var masterConnection = engine.makeConnection(_masterString, control, masterCallback);
}

function setCallbacks() {
    setLibraryCallback(moveVerticalController, 'MoveVertical', nothing);
    setMasterCallback(masterGainController, 'gain', _mapKnobInverse);
    setMasterCallback(crossfaderController, 'crossfader', _mapNonStandardInverse);

    setBeatCallback(beatController, 'beat_active', _mapStandardInverse);
    setJogCallback('jog', _mapScratchInverse);

    setChannelCallback(loadTrackController, 'LoadSelectedTrack', nothing)
    setChannelCallback(syncController, 'sync_enabled', nothing);
    setChannelCallback(cueController, 'cue_default', nothing);
    setChannelCallback(keylockController, 'keylock', nothing);
    setChannelCallback(pflController, 'pfl', nothing);
    setChannelCallback(loopSizeController, 'beatloop_size', _mapLoopSizeInverse);
    setChannelCallback(loopToggleController, 'beatloop_activate', nothing);
    setChannelCallback(jumpSizeController, 'beatjump_size', _mapLoopSizeInverse);
    setChannelCallback(jumpForwardController, 'beatjump_forward', nothing); 
    setChannelCallback(jumpBackwardController, 'beatjump_backward', nothing);
    setChannelCallback(preGainController, 'pregain', _mapKnobInverse);
    setChannelCallback(scratchEnabledController, 'scratch2_enable', nothing);
    setChannelCallback(playController, 'play', nothing);
    setChannelCallback(rateController, 'rate', _mapNonStandardInverse);
    setChannelCallback(volumeController, 'volume', _mapStandardInverse);


    setEQCallback(hiEQController, 'parameter3', _mapKnobInverse);
    setEQCallback(midEQController, 'parameter2', _mapKnobInverse);
    setEQCallback(loEQController, 'parameter1', _mapKnobInverse);
    setFilterCallback(filterController, 'super1', _mapStandardInverse);

    setFxMixCallback(fxMixController, 'mix', _mapStandardInverse);
    setFxCallback(metaOneController, 'meta1', _mapStandardInverse);
    setFxCallback(metaTwoController, 'meta2', _mapStandardInverse);
    setFxCallback(metaThreeController, 'meta3', _mapStandardInverse);

    setHotcueCallback(hotcueOneController, 'hotcue_1_activate');
    setHotcueCallback(hotcueTwoController, 'hotcue_2_activate');
    setHotcueCallback(hotcueThreeController, 'hotcue_3_activate');
    setHotcueCallback(hotcueFourController, 'hotcue_4_activate');

}

function init() {
    // engine.setValue(_libraryString, 'sort_column', sortByPosition); // sort by position
    // engine.setValue(_libraryString, 'sort_order', 0); // sort ascending
    setCallbacks();
}

const _focusNode = function() {
    engine.setValue(_libraryString, 'MoveFocusForward', 1);
}

/* ------------------------------------------------------------------------------ */

AutoController.loop = function(channel, controller, value, status, group) {
    var beatloop_size = engine.getValue(_channelString(channel), 'beatloop_size');
    engine.setValue(_channelString(channel), _beatloopToggleString(beatloop_size), 1);
}

// channel controls
AutoController.mappedSet = function(channel, controller, value, status, group) {
    var mappedVal;
    switch(group) {
        // certain groups need values remapped
        case 'volume': 
            mappedVal = _mapStandard(value);
            break;
        case 'beatloop_size': 
            mappedVal = _mapLoopSize(value);
            break;
        case 'beatjump_size': 
            mappedVal = _mapLoopSize(value);
            break;
        case 'pregain': 
            mappedVal = _mapKnob(value);
            break;
        case 'rate': 
            mappedVal = _mapNonStandard(value);
            break;
        case 'jog': 
            mappedVal = _mapScratch(value);
            break;
        default: mappedVal = value;
    }
    engine.setValue(_channelString(channel), group, mappedVal);
}

AutoController.play = function(channel, controller, value, status, group) {
    var playing = engine.getValue(_channelString(channel), group);
    engine.setValue(_channelString(channel), group, !playing);
}

AutoController.setFilter = function(channel, controller, value, status, group) {
    engine.setValue(_filterString(channel), group, _mapLinInverse(value));
}

AutoController.setEQ = function(channel, controller, value, status, group) {
    engine.setValue(_eqString(channel), group, _mapKnobInverse(value));
}

AutoController.setFxMix = function(channel, controller, value, status, group) {
    engine.setValue(_fxMixString(channel), group, _mapLinInverse(value));
}

AutoController.setFx = function(channel, controller, value, status, group) {
    const controlString = _fxString(channel, _fxNumString(group))
    engine.setValue(controlString, _metaString(group), _mapLinInverse(value));
}

AutoController.setScratch = function(channel, controller, value, status, group) {
    engine.scratchTick(channel, value);
}

AutoController.setScratchEnable = function(channel, controller, value, status, group) {
    if (value === 1) {
        var alpha = 1.0/8;
        var beta = alpha/32;
        engine.scratchEnable(channel, 128, 33+1/3, alpha, beta);
    }
    else engine.scratchDisable(controllerNumber);
}

AutoController.activateHotcue = function(channel, controller, number) {
    engine.setValue(_channelString(channel), _hotcueString(number), 1);
}

AutoController.moveVertical = function(channel, controller, value, status, group) {
    engine.setValue(_libraryString, group, _mapBrowseInverse(value));
}

AutoController.setCrossfader = function(channel, controller, value, status, group) {
    engine.setValue(_masterString, group, _mapLinInverse(value));
}

AutoController.setMasterGain = function(channel, controller, value, status, group) {
    engine.setValue(_masterString, group, _mapKnobInverse(value));
}
