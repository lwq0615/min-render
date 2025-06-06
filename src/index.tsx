import { This, defineThisProperties, reactive, renderRoot } from '../core'

defineThisProperties({
  log: console.log,
})

const obj = reactive({
  a: 0,
  b: 1,
})

function Test3(props: { obj: any }) {
  return 123
}

function Test2() {
  console.log(this)
  return (
    <div>
      <div>{obj.a}</div>
      <div>{obj.b}</div>
      <button onClick={() => obj.a++}>change</button>
    </div>
  )
}

function Test(this: This, props: any) {
  return (
    <div
      id="a1"
      ref="a1"
    >
      <Test2 />
      <Test3 obj={obj} />
    </div>
  )
}

renderRoot(<Test />, document.getElementById('app'))
