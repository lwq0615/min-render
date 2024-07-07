import { renderRoot } from "../core";

function Test2(props: any) {
  return <span>
    {props.children}
  </span>
}

function Test() {
  this.useCreated(() => {
    this.count = 0;
  });
  this.useMounted(() => {
    this.count++;
  });
  return (
    <>
      <Test2 name="222" ref="test2">
        <div>322</div>
      </Test2>
      <div>333div</div>
    </>
  );
}

renderRoot(<Test />, document.getElementById("app"));
