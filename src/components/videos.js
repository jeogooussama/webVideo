import { useState, useEffect } from 'react';
import Video from './video';
function Videos(props) {
  const [rVideos, setRVideos] = useState([]);
  const [remoteStreams, setRemoteStreams] = useState([]);

  useEffect(() => {
    if (props.remoteStreams !== remoteStreams) {
      let _rVideos = props.remoteStreams.map((rVideo, index) => {
        let video = (
          <Video
            videoStream={rVideo.stream}
            frameStyle={{ width: 120, float: 'left', padding: '0 3px' }}
            videoStyles={{
              cursor: 'pointer',
              objectFit: 'cover',
              borderRadius: 3,
              width: '100%',
            }}
            key={index}
          />
        );

        return (
          <div
            id={rVideo.name}
            onClick={() => props.switchVideo(rVideo)}
            style={{ display: 'inline-block' }}
            key={index}
          >
            {video}
          </div>
        );
      });

      setRVideos(_rVideos);
      setRemoteStreams(props.remoteStreams);
    }
  }, [props, props.remoteStreams, remoteStreams, props.switchVideo]);

  return (
    <div
      style={{
        zIndex: 3,
        position: 'fixed',
        padding: '6px 3px',
        backgroundColor: 'rgba(0,0,0,0.3)',
        maxHeight: 120,
        top: 'auto',
        right: 10,
        left: 10,
        bottom: 10,
        overflowX: 'scroll',
        whiteSpace: 'nowrap',
      }}
    >
      {rVideos}
    </div>
  );
}

export default Videos;
