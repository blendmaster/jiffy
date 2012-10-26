"use strict"

function map(a, fn) { return Array.prototype.map.call(a, fn) }
function bits(byte, start, end) {
  return byte << (24 + start) >>> (32 + start - end)
}
function hex(a) { return map(a, function (n) { return n.toString(16) }).join() }

function split() {
  var file
  if (file = this.files[0]) {
    var reader = new FileReader
    reader.readAsArrayBuffer(file)
    // http://www.onicos.com/staff/iz/formats/gif.html#aeb
    reader.onload = function () {
      window.bytes = this.result
      var data = Uint8Array(bytes)
      if (!(map(data.subarray(0, 6), function(c) { return String.fromCharCode(c) }).join('')
            === 'GIF89a')) {
        return alert('not a gif, man!')
      }
      var width = Uint16Array(bytes, 6, 1)[0]
      var height = Uint16Array(bytes, 8, 1)[0]

      var colordata = data[10]
      console.log(colordata)
      var gct            = bits(colordata, 0, 1)
      //, resolution     = bits(colordata, 1, 4)
      //, sort           = bits(colordata, 4, 5)
        , colorTableSize = bits(colordata, 5, 8)

      var endOfHeader = 13
                      + (gct === 1
                        ? 3 * colorTableSize
                        : 0)
      console.log(endOfHeader)
      var header = data.subarray(0, endOfHeader)
      console.log(hex(header))
      var rest = data.subarray(endOfHeader)
      console.log( hex(rest.subarray(0, 10)))

      // eat app extension block
      var i = 4
      var bSize
      while (bSize = rest[i]) { i += bSize }
      i += 1 // skip terminator

      console.log(i)
      var imgdata = rest.subarray(i)

      var j = 0, start, blocks = [], lctf, tableSize
      while (j < imgdata.length && imgdata[j] !== 0x3b) { // is not trailer
        start = j
        j += 8 // skip over graphic control extension block
        lctf = bits(imgdata[j + 8], 0, 1), tableSize = bits(imgdata[j + 8], 5, 8)
        if (lctf) { j += 3 * tableSize }
        j += 1 // LZW minimum code size
        bSize = imgdata[j]
        j += bSize
        blocks.push(imgdata.subarray(start, j))
        j += 1 //skip terminator
      }

      // draw blocks
      blocks.forEach(function (b) {
        var blob = new Blob([header, b], {type: 'image/gif'})
        var url = URL.createObjectURL(blob)
        var i = new Image
        i.src = url
        document.body.appendChild(i)
      })
    }
  }
}
var input = document.getElementById('input')
input.addEventListener('change', split)
split.call(input)
