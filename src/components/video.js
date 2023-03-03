import { useState, useEffect } from 'react';

function Video(props) {
  const [videoRef, setVideoRef] = useState(null);

  useEffect(() => {
    if (videoRef && props.videoStream) {
      videoRef.srcObject = props.videoStream;
    }
  }, [videoRef, props.videoStream]);

  return (
    <div style={{ ...props.frameStyle }}>
      <video
        id={props.id}
        muted={props.muted}
        autoPlay
        style={{ ...props.videoStyles }}
        ref={(ref) => setVideoRef(ref)}
      ></video>
    </div>
  );
}

export default Video;
