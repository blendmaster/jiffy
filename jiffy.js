"use strict"

window.URL || (window.URL = window.webkitURL)

function map(a, fn) { return Array.prototype.map.call(a, fn) }
function bits(byte, start, end) {
  return byte << (24 + start) >>> (32 + start - end)
}
function uint16(b1, b2) { return (b2 << 8) | b1 }

function hex(a) { return map(a, function (n) { return n.toString(16) }).join() }
function chars(a) {
  return map(a, function (c) { return String.fromCharCode(c) }).join('')
}


var jiffy = {
  // split a gif image as an ArrayBuffer into:
  // cb(err, { width, height, [frames] })
  split: function (file, cb) {
    var reader = new FileReader
    reader.readAsArrayBuffer(file)
    reader.onload = function () {
      window.data = this.result
      // http://www.onicos.com/staff/iz/formats/gif.html#aeb
      // http://www.w3.org/Graphics/GIF/spec-gif89a.txt
      var data = new Uint8Array(this.result)
      if (chars(data.subarray(0, 6)) !== 'GIF89a') {
        cb(new Error('not a gif, man!'))
        return
      }

      var width          = uint16(data[6], data[7])
        , height         = uint16(data[8], data[9])
        , gct            = bits(data[10], 0, 1)
        , colorTableSize = bits(data[10], 5, 8)

      var endOfHeader = 13 + (gct ? 3 * Math.pow(2, colorTableSize + 1) : 0)

      var header = window.header = data.subarray(0, endOfHeader)
      var rest   = data.subarray(endOfHeader)

      // TODO detect actual GIF animation block "NETSCAPE2.0"
      // skip app extension block
      var imgdata = rest.subarray(19)

      var i = 0
        , start
        , blocks = []
        , disposalMethods = []
        , delays = []
        , lctf
        , tableSize
        , bSize

      while (imgdata[i] !== 0x3b) { // is not the trailer
        start = i

        if (!(imgdata[i] === 0x21 && imgdata[i + 1] === 0xf9)) {
          cb(new Error('not a graphic control extension block, bro!'))
          return
        }

        i += 3
        disposalMethods.push(bits(imgdata[i], 3, 6))

        i += 1
        // if 0, use default to match browser behavior
        delays.push((uint16(imgdata[i], imgdata[i + 1]) * 10) || 100)

        i += 4 // skip over rest graphic control extension block
        if (imgdata[i] !== 0x2c) {
          cb(new Error('not an image block, dude!'))
          return
        }

        i += 9 // skip to packed byte
        lctf      = bits(imgdata[i], 0, 1)
        tableSize = bits(imgdata[i], 4, 8)
        i += 1

        if (lctf) { i += (3 * Math.pow(2, tableSize + 1)) }

        i += 1 // skip over LZW minimum code size

        // eat up data blocks
        while (bSize = imgdata[i]) { i += bSize + 1 }

        i += 1 //skip terminator

        blocks.push(imgdata.subarray(start, i))
      }

      var imgs = blocks.map(function (b, k) {
        var blob = new Blob([header, b], {type: 'image/gif'})
        var url = URL.createObjectURL(blob)
        var i = new Image
        i.onload = load
        i.onerror = function () { console.log('dawg, that image ain\'t right!') }
        i.src = url
        return i
      })

      // after all images loaded
      var j = 1
      function load() {
        if (++j === blocks.length) {
          cb(null,
            { width: width
            , height: height
            , frames: imgs.map(function (i, j) {
                return { image: i
                       , delay: delays[j]
                       , disposalMethod: disposalMethods[j]
                       }
              })
            })
        }
      }
    }
  }
}

var anim = { c       : document.getElementById('anim')
           , ctx     : document.getElementById('anim').getContext('2d')
           , loaded  : false
           , playing : false
           , tick    : function () {
               if (this.loaded) {
                 this.ctx.drawImage(this.frames[this.i].image, 0, 0)
                 if (this.playing) {
                   this.timeout = setTimeout(this.tick, this.frames[this.i].delay)
                 }
                 if (++this.i === this.frames.length) {
                   this.i = 0
                 }
               }
             }
           , back    : function () {
               this.stop()
               this.i = Math.max(0, this.i - 2)
               this.tick()
             }
           , forward  : function () {
               this.stop()
               this.tick()
             }
           , start   : function (frames) {
               this.stop()
               this.frames = frames
               this.i = 0
               this.c.width = this.frames[this.i].image.width
               this.c.height = this.frames[this.i].image.height
               this.loaded = true
               this.playing = true
               this.tick()
             }
           , stop    : function () {
               clearTimeout(this.timeout)
               this.playing = false
             }
           , pause   : function () {
               this.stop()
             }
           , play    : function () {
               this.stop()
               this.playing = true
               this.tick()
             }
           }
// annoying need to bind
anim.tick = anim.tick.bind(anim)

document.getElementById('play').addEventListener('click', anim.play.bind(anim))
document.getElementById('pause').addEventListener('click', anim.pause.bind(anim))
document.getElementById('back').addEventListener('click', anim.back.bind(anim))
document.getElementById('forward').addEventListener('click', anim.forward.bind(anim))

function load() {
  var file
  if (file = this.files[0]) {
    jiffy.split(file, function (err, img) {
      if (err) { throw err }

      var blocks = img.blocks

      var c = document.getElementById('anim')
      c.width  = img.width
      c.height = img.height

      // draw blocks
      var frames = document.createElement('div')
      frames.id = 'frames'
      img.frames.forEach(function (f) {
        frames.appendChild(f.image)
      })
      document.body.replaceChild(frames, document.getElementById('frames'))

      anim.start(img.frames)

      // encode vid
      //var video = new Whammy.Video
      //img.frames.forEach(function (f) {
        //var c = document.createElement('canvas')
        //c.width = f.image.width
        //c.height = f.image.height
        //c.getContext('2d').drawImage(f.image, 0, 0)
        //video.add(c, f.delay)
      //})
      //document.getElementById('vid').src = URL.createObjectURL(video.compile())
    })
  }
}
var input = document.getElementById('input')
input.addEventListener('change', load)
load.call(input)

