import { useState, useEffect, useRef } from 'react';
import io from 'socket.io-client'
import Video from './components/video'
import Videos from './components/videos'
import "./App.css"

function App() {
  const [localStream, setLocalStream] = useState(null);
  const [remoteStream, setRemoteStream] = useState(null);
  const [remoteStreams, setRemoteStreams] = useState([]);
  const [peerConnections, setPeerConnections] = useState({});
  const [selectedVideo, setSelectedVideo] = useState(null);
  const [status, setStatus] = useState('Please wait...');
  const [pcConfig] = useState({
    iceServers: [
      {
        urls: 'stun:stun.l.google.com:19302'
      }
    ]
  });
  const [sdpConstraints] = useState({
    mandatory: {
      OfferToReceiveAudio: true,
      OfferToReceiveVideo: true
    }
  });
  const [serviceIP] = useState('https://cc82bd38.ngrok.io/webrtcPeer');
  let socket = useRef(null);

  const getLocalStream = () => {
    const success = (stream) => {
      window.localStream = stream
      setLocalStream(stream)
      whoisOnline()
    }

    const failure = (e) => {
      console.log('getUserMedia Error: ', e)
    }

    const constraints = {
      video: true,
      options: {
        mirror: true,
      }
    }

    navigator.mediaDevices.getUserMedia(constraints)
      .then(success)
      .catch(failure)
  }

  const whoisOnline = () => {
    sendToPeer('onlinePeers', null, { local: socket.id })
  }

  const sendToPeer = (messageType, payload, socketID) => {
    socket.emit(messageType, {
      socketID,
      payload
    })
  }

  const createPeerConnection = (socketID, callback) => {
    try {
      let pc = new RTCPeerConnection(pcConfig)
      const peerConnectionsCopy = { ...peerConnections, [socketID]: pc }
      setPeerConnections(peerConnectionsCopy)

      pc.onicecandidate = (e) => {
        if (e.candidate) {
          sendToPeer('candidate', e.candidate, {
            local: socket.id,
            remote: socketID
          })
        }
      }

      pc.oniceconnectionstatechange = (e) => {
      }

      pc.ontrack = (e) => {
        const remoteVideo = {
          id: socketID,
          name: socketID,
          stream: e.streams[0]
        }

        setRemoteStreams(prevRemoteStreams => {
          if (prevRemoteStreams.length === 0) setRemoteStream(e.streams[0])
          if (selectedVideo) {
            if (prevRemoteStreams.filter(stream => stream.id === selectedVideo.id).length === 0) {
              setSelectedVideo(remoteVideo)
            }
          } else {
            setSelectedVideo(remoteVideo)
          }

          return [...prevRemoteStreams, remoteVideo]
        })
      }

      pc.close = () => {
      }

      if (localStream)
        pc.addStream(localStream)

      callback(pc)

    } catch (e) {
      console.log('Something went wrong! pc not created!!', e)
      callback(null)
    }
  }

  useEffect(() => {
    socket = io.connect(
      serviceIP,
      {
        path: '/io/webrtc',
        query: {}
      }
    )

    socket.on('connection-success', data => {
      getLocalStream()

      console.log(data.success)
      const status = data.peerCount > 1 ? `Total Connected Peers: ${data.peerCount}` : 'Waiting for other peers to connect'
      setStatus(status)
    })
    socket.on('joined-peers', data => {
      const peers = data.filter(peerSocketId => peerSocketId !== socket.id)

      peers.forEach(peerSocketId => {
        createPeerConnection(peerSocketId, (pc) => {
          if (pc) {
            pc.createOffer(sdpConstraints)
              .then(sdp => {
                pc.setLocalDescription(sdp)

                sendToPeer('offer', sdp, {
                  local: socket.id,
                  remote: peerSocketId
                })
              })
          }
        })
      })
    })

    socket.on('offer', (data) => {
      createPeerConnection(data.socketID, (pc) => {
        pc.addStream(localStream)

        pc.setRemoteDescription(new RTCSessionDescription(data.payload))

        pc.createAnswer(sdpConstraints)
          .then(sdp => {
            pc.setLocalDescription(sdp)

            sendToPeer('answer', sdp, {
              local: socket.id,
              remote: data.socketID
            })
          })
      })
    })

    socket.on('answer', (data) => {
      const pc = peerConnections[data.socketID]
      pc.setRemoteDescription(new RTCSessionDescription(data.payload))
    })

    socket.on('candidate', (data) => {
      const pc = peerConnections[data.socketID]
      if (pc) {
        pc.addIceCandidate(new RTCIceCandidate(data.payload))
      }
    })

    return () => {
      socket.disconnect()
      const peerConnectionsCopy = { ...peerConnections }
      Object.keys(peerConnectionsCopy).forEach(pc => {
        peerConnectionsCopy[pc].close()
        delete peerConnectionsCopy[pc]
      })
      setPeerConnections(peerConnectionsCopy)
    }
  }, [localStream])

  const switchVideo = (_video) => {
    setSelectedVideo(_video)
  }

  const renderVideos = () => {
    return (
      <>
        <Video
          videoStyles={{
            zIndex: 2,
            position: 'absolute',
            right: 0,
            width: 200,
            height: 200,
            margin: 5,
            backgroundColor: 'black'
          }}
          videoStream={localStream}
          autoPlay muted
        />
        {
          remoteStreams.map(rVideo => (
            <Video
              key={rVideo.id}
              videoStyles={{
                width: '50%',
                height: '50%'
              }}
              videoStream={rVideo.stream}
              onClick={() => switchVideo(rVideo)}
            />
          ))
        }
      </>
    )
  }

  return (
    <div>
      {remoteStream && (
        <Video
          videoStyles={{
            zIndex: 1,
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            objectFit: 'cover'
          }}
          videoStream={remoteStream}
          autoPlay
        />
      )}
      {renderVideos()}
      <Videos
        switchVideo={switchVideo}
        remoteStreams={remoteStreams}
        selectedVideo={selectedVideo}
      />
      <div>{status}</div>
    </div>
  )
}

export default App;  