"use strict"

function map(a, fn) { return Array.prototype.map.call(a, fn) }
function bits(byte, start, end) {
  return byte << (24 + start) >>> (32 + start - end)
}
function hex(a) { return map(a, function (n) { return n.toString(16) }).join() }
function chars(a) {
  return map(a, function (c) { return String.fromCharCode(c) }).join('')
}

function split() {
  var file
  if (file = this.files[0]) {
    var reader = new FileReader
    reader.readAsArrayBuffer(file)
    // http://www.onicos.com/staff/iz/formats/gif.html#aeb
    reader.onload = function () {
      window.bytes = this.result
      var data = Uint8Array(bytes)
      if (!(chars(data.subarray(0, 6)) === 'GIF89a')) {
        return alert('not a gif, man!')
      }
      var width = Uint16Array(bytes, 6, 1)[0]
      var height = Uint16Array(bytes, 8, 1)[0]

      var colordata = data[10]
      var gct            = bits(colordata, 0, 1)
      //, resolution     = bits(colordata, 1, 4)
      //, sort           = bits(colordata, 4, 5)
        , colorTableSize = bits(colordata, 5, 8)

      var endOfHeader = 13
                      + (gct === 1
                        ? 3 * Math.pow(2, colorTableSize + 1)
                        : 0)
      var header = data.subarray(0, endOfHeader)
      var rest = data.subarray(endOfHeader)

      // TODO detect actual GIF animation block "NETSCAPE2.0"
      // skip app extension block
      var imgdata = rest.subarray(19)

      var i = 0, start, blocks = [], lctf, tableSize, bSize
      while (i < imgdata.length && imgdata[i] !== 0x3b) { // is not trailer
        start = i
        i += 8 // skip over graphic control extension block
        i += 1
        i += 8 // skip to packed byte
        lctf      = bits(imgdata[i], 0, 1)
        tableSize = bits(imgdata[i], 4, 8)
        if (lctf) { i += (3 * Math.pow(2, tableSize + 1)) }
        i += 1 // LZW minimum code size
        i += 1 // to bsize

        // eat up data blocks (size !== 0)
        while (bSize = imgdata[i]) {
          i += 1
          i += bSize
        }

        blocks.push(imgdata.subarray(start, i))

        i += 1 //skip terminator
      }

      // draw blocks
      var frames = document.createElement('div')
      frames.id = 'frames'
      blocks.forEach(function (b) {
        var blob = new Blob([header, b], {type: 'image/gif'})
        var url = URL.createObjectURL(blob)
        var i = new Image
        i.src = url
        frames.appendChild(i)
      })
      document.body.replaceChild(frames, document.getElementById('frames'))
    }
  }
}
var input = document.getElementById('input')
input.addEventListener('change', split)
split.call(input)
