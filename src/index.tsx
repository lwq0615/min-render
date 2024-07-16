import { This, renderRoot, useStore } from "../core";

const obj = useStore({
  a: 0
})



function Test3() {
  return <button onClick={() => obj.a++}>change</button>;
}

function Test2(props: any) {
  return obj.a
}

function Test(props: any, that: This) {
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
      <Test2/>
      <Test3/>
    </div>
  );
}

renderRoot(<Test />, document.getElementById("app"));
