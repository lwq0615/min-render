import { renderRoot, useReactive, This, defineThisProperties } from "../core";

defineThisProperties({
  log: console.log
})

const obj = useReactive({
  a: 0,
  b: 1
})



function Test3() {
  return (
    <div>
      <button onClick={() => obj.a++}>changea</button>
      <button onClick={() => obj.b++}>changeb</button>
    </div>
  );
}

function Test2(this: This, props: any) {
  this.useWatch((oldVal, newVal) => {
    console.log(oldVal, newVal);
  }, [obj.b, obj.a])
  return (
    <div>
      <div>{obj.a}</div>
      <div>{obj.b}</div>
    </div>
  )
}

function Test(this: This, props: any) {
  this.useMounted(() => {
    console.log(this);
  })
  return (
    <div id="a1" ref="a1">
      <Test2 a="1" ref="test2"/>
      <Test3/>
    </div>
  );
}

renderRoot(<Test />, document.getElementById("app"));
