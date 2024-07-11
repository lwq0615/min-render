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

// function Test(props: any, that: This) {
//   this.useCreated(() => {
//     this.count = [];
//   });
//   this.useMounted(() => {
//     // this.count = 1;
//     this.count[0] = 3
//   });
//   return (
//     <div id="a1" ref="a1">
//       {this.count.map((item: number) => (
//         <div key={item}>{item}</div>
//       ))}
//       <button onClick={() => this.count.push(Math.ceil(Math.random() * 10))}>+++</button>
//       <button onClick={() => this.count.shift()}>---</button>
//     </div>
//   );
// }

function Test(props: any, that: This) {
  this.useCreated(() => {
    this.count = {
      a: {
        b: 1
      }
    };
  });
  this.useMounted(() => {
    // this.count = 1;
    // this.count.a
  });
  console.log(this.count);
  return (
    <div id="a1" ref="a1">
      {this.count}
      {this.count.a.b < 3 && <Test2/>}
      <button onClick={() => this.count.a.b++}>+++</button>
      <button onClick={() => this.count.a.b--}>---</button>
    </div>
  );
}

renderRoot(<Test />, document.getElementById("app"));
