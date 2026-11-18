export default function Ball({ spin = false }) {
  return <img src="/img/ball.png" alt="" className={spin ? 'pixel-ball spin' : 'pixel-ball'} />
}
