import { This, renderRoot } from "../core";

function Test3() {
  return 123;
}

function Test2(props: any) {
  this.useCreated(() => {
    this.aa = 123;
  });
  this.useExpose({
    aaa: () => {
      this.aa++;
    },
  });
  return (
    <>
      <div>{this.aa}</div>
      {props.children}
    </>
  );
}

function Test(props: any, that: This) {
  this.useCreated(() => {
    // this.count = 0;
  });
  this.useMounted(() => {
    this.count = 1;
  });
  return (
    <div id="a1" ref="a1">
      {/* {new Array(this.count).fill("").map((item, i) => (
          <div key={i}>{i}</div>
        ))}
        <Test2 ref="t2">
          {this.count}
        </Test2> */}
      {this.count}
      <button onClick={() => this.count++}>+++</button>
      <button onClick={() => this.count--}>---</button>
    </div>
  );
}

renderRoot(<Test />, document.getElementById("app"));
