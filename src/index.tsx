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

function Test(props: any) {
  // this.useCreated(() => {
  //   this.count = {
  //     a: {
  //       b: 1
  //     }
  //   };
  // });
  // console.log(obj);
  // this.useMounted(() => {
    // this.count = 1;
    // this.count.a
  // });
  // const unWatch = this.useWatch(() => [this.count], () => {
  //   console.log(123);
  // })
  return (
    <div id="a1" ref="a1">
      {/* {this.count}
      {this.count.a.b}
      <button onClick={() => this.count.a.b++}>+++</button>
      <button onClick={() => this.count.a.b--}>---</button> */}
      <Test2 a="1"/>
      <Test3/>
    </div>
  );
}

renderRoot(<Test />, document.getElementById("app"));
