export default function Ball({ spin = false }) {
  return (
    <img
      src="/img/ball.png"
      alt=""
      width="64"
      height="64"
      decoding="async"
      className={spin ? 'pixel-ball spin' : 'pixel-ball'}
    />
  )
}
