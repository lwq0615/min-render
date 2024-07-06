import { renderRoot } from "../core";

function Test2() {
  return <span>test2s</span>
}

function Test() {
  this.useCreated(() => {
    this.count = 0;
  });
  this.useMounted(() => {
    this.count++;
  });
  return (
    <div>
      <div>123</div>
      <Test2/>
      <button onClick={() => {
        this.count++
      }}>{this.count}</button>
      <button onClick={() => console.log(this)}>log</button>
    </div>
  );
}

renderRoot(Test, document.getElementById("app"));
