import { Instance } from "@core/Instance";
import { renderRoot } from "../core";

function Test2(props: any) {
  this.useCreated(() => {
    this.aa = 123;
  });
  this.useExpose({
    aaa: () => {
      this.aa++
    }
  })
  return <div>{this.aa}</div>;
}

function Test(props: any, that: Instance) {
  this.useCreated(() => {
    this.count = 0;
  });
  this.useMounted(() => {
    this.count++;
  });
  return (
    <>
      <div id="a1" ref="a1"> 
        {
          new Array(this.count).fill('').map((item, i) => <div key={i}>{i}</div>)
        }
        <Test2 ref="t2"/>
        <button onClick={() => this.refs.t2.aaa()}>+++</button>
        <button onClick={() => this.count--}>---</button>
      </div>
      <div>sss</div>
    </>
  );
}

renderRoot(<Test />, document.getElementById("app"));
